/*
Purposes:
    - Contain Octokit/Github Api wrapper functions
    - Contain all simpleGit wrapper functions
*/

import { Octokit } from "@octokit/rest";
import axios, { AxiosResponse, AxiosError } from "axios";
import axiosRetry from "axios-retry";
import { simpleGit, SimpleGit, CleanOptions } from 'simple-git';
import { parsePullRequestData, scanFiles } from "./FileUtils";
import { ForegroundColor, ColorReset } from "./Utils";

export default class GithubUtils {

    apiKey: string;
    octokit: Octokit;
    git;
    owner: string;
    repo: string;
    mainBranch: string;

    // Initialize key, octokit, and simpleGit
    constructor(githubApiKey: string, owner: string, repo: string, mainBranch: string) {
        this.apiKey = githubApiKey;
        this.octokit = new Octokit({
            auth: this.apiKey,
        });
        this.git = simpleGit().clean(CleanOptions.FORCE);
        this.owner = owner;
        this.repo = repo;
        this.mainBranch = mainBranch;
    }

    // Creates a branch or updates an existing branch by rebasing on main
    public async configureBranch(newBranchRef: string) { 
        let status;
        try {
            status = await this.octokit.rest.repos.getBranch(
                {
                    owner: this.owner,
                    repo: this.repo,
                    branch: newBranchRef,
                }
            );
        } catch (errorStatus) {
            status = errorStatus;
        }

        status = status.status;
        console.log(status);

        // If it doesn't exist, create the branch
        if (status == 404) {

            // First get the latest commit
            const latestCommit = await this.octokit.rest.repos.getCommit({
                owner: this.owner,
                repo: this.repo,
                ref: this.mainBranch,
                headers: {
                    Accept: 'sha',
                }
            });

            const commitSha = latestCommit.data.sha

            // Now create the branch based off of the latest sha
            await this.octokit.rest.git.createRef({
                owner: this.owner,
                repo: this.repo,
                ref: newBranchRef,
                sha: commitSha,
            });

        } else { 
            // If the branch does already exist, update it if it has a pull request
            let pullRequestData = await this.octokit.rest.pulls.list({
                owner: this.owner,
                repo: this.repo,
            });

            const prList = pullRequestData.data;
            
            if (prList.length > 0) {
                const prNumber = prList[0].number // There sould only be 1 pr here
                this.octokit.rest.pulls.updateBranch({
                    owner: this.owner,
                    repo: this.repo,
                    pull_number: prNumber,
                });
            }
        }
    }

    // Checkout the branch, fetch, and pull
    public async setupBranchLocally(targetBranch: string) {
        // Checkout the branch!
        await this.git.checkoutBranch(targetBranch);
        const branch = await this.git.branch();
        const currentBranch = branch.current;
        console.log(currentBranch);

        // Ensure recent changes exist locally
        await this.git.fetch();
        await this.git.pull();
    }

    // Commit any local changes to the current branch locally
    public async commitLocal(commitMessage: string) {
        // Make changes, commit, and push
        await this.git.add('*'); // Add all changed files
        await this.git.commit(commitMessage); // Commit the changed files

        // Push the changes to the checked out branch
        await this.git.push()
        console.log('Push + test some stuff out')
    }

    public async createPullRequest(targetBranch: string, title: string, body: string) {
        // Only one PR should exist on the target branch

        // List all pulls to get the one we want
        let pullRequestData = await this.octokit.rest.pulls.list({
            owner: this.owner,
            repo: this.repo,
        });

        const prList = pullRequestData.data;
        try {
            // If empty make a new pr
            if (prList.length == 0) {
                await this.octokit.rest.pulls.create({
                    owner: this.owner,
                    repo: this.repo,
                    title: title,
                    head: targetBranch,
                    base: this.mainBranch,
                });
                console.log('Created a Pull Request');
            } else { // PR exists, try updating
                const prNumber = prList[0].number // There sould only be 1 pr here
                await this.octokit.rest.pulls.update({
                    owner: this.owner,
                    repo: this.repo,
                    pull_number: prNumber,
                    title: title,
                    body: body, // Kept getting errors without a body?
                });
                console.log('Updated a Pull Request')
            }
        } catch(pullError) {
            console.log('Pull Request not created or updated, no new changes');
            console.log(pullError);
        }
    }

    // Leverage Github API and environment variables to access files touched by Pull Requests
    public static async getFiles(githubKey: string): Promise<string[]> {

        let fileList = [];
        const directory = GithubUtils.getGithubDirectory();

        // Only run on Pull Requests
        if (!GithubUtils.isGithubEventSchedule()) {

            const pullRequestNum = GithubUtils.getPullRequestNum();
            const githubOwner = GithubUtils.getRepoOwner();
            const repoName = GithubUtils.getRepoName();

            console.log(`Checking out ${githubOwner}:${repoName} on Pull Request ${pullRequestNum}`);

            const retries = 7;
            axiosRetry(axios, {
            retries: retries,
            });
            const timeout = 2000000;

            // Do a GITHUB API Get request for the specific pull that triggered the workflow
            // Use that to get the touched files
            let result: AxiosResponse | undefined;
            try {
            result = await axios.get(
                `https://api.github.com/repos/${githubOwner}/${repoName}/pulls/${pullRequestNum}/files`,
                {
                    headers: {
                        'Authorization': `Bearer ${githubKey}`,
                        'Accept': 'application/vnd.github+json',
                        'Content-Type': 'application/json',
                    },
                    timeout: timeout, // Sometimes the delay is greater than the speed GH workflows can get the data
                    data: {
                        'per_page': 100,
                        'page': 1,
                    }
                }
            )
            } catch (e: unknown) {
                result = (e as AxiosError)?.response;
                throw Error(`Error Requesting after ${retries} attempts`);
            }
            
            console.log('Picking up Files ☺');
            fileList = parsePullRequestData(result?.data, directory);
            console.log('Finished picking up Files ☺\n');

        } else {
            fileList = await scanFiles(directory); // No need to do a Get request, just check locally
        }

        for (const fileDir of fileList) {
            // Output a valid file found, wrap it with ANSI Green
            console.log(`\t${ForegroundColor.Green}${fileDir}${ColorReset}`)
        }

        return fileList;
    }

    // Static functions that use environment variables from Github workflow
    public static getGithubDirectory(): string { // The local directory of the workflow
        return process.env.GITHUB_WORKSPACE;
      }
    
    public static getGithubEventName(): string { // pullrequest, schedule, etc
        return process.env.GITHUB_EVENT_NAME;
    }

    public static isGithubEventSchedule(): boolean {
        return this.getGithubEventName() == 'schedule';
    }

    public static getRepoOwner(): string {
        const repo = process.env.GITHUB_REPOSITORY.split('/'); // owner/repo
        return repo[0];
    }

    public static getRepoName(): string {
        const repo = process.env.GITHUB_REPOSITORY.split('/'); // owner/repo
        return repo[1];
    }

    public static getPullRequestNum(): string {
        const githubRef = process.env.GITHUB_REF.split('/'); // refs/pulls/pr_num/merge
        return githubRef[2];
    }

    public static getRefName(): string {
        const githubRefName = process.env.GITHUB_REF_NAME;
        return githubRefName;
    }
}