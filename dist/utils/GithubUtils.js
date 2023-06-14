"use strict";
/*
Purposes:
    - Contain Octokit/Github Api wrapper functions
    - Contain all simpleGit wrapper functions
*/
Object.defineProperty(exports, "__esModule", { value: true });
const rest_1 = require("@octokit/rest");
const axios_1 = require("axios");
const axios_retry_1 = require("axios-retry");
const simple_git_1 = require("simple-git");
const FileUtils_1 = require("./FileUtils");
const Utils_1 = require("./Utils");
class GithubUtils {
    // Initialize key, octokit, and simpleGit
    constructor(githubApiKey, owner, repo, mainBranch) {
        this.apiKey = githubApiKey;
        this.octokit = new rest_1.Octokit({
            auth: this.apiKey,
        });
        this.git = (0, simple_git_1.simpleGit)().clean(simple_git_1.CleanOptions.FORCE);
        this.owner = owner;
        this.repo = repo;
        this.mainBranch = mainBranch;
    }
    // Creates a branch or updates an existing branch by rebasing on main
    async configureBranch(newBranchRef) {
        let status;
        try {
            status = await this.octokit.rest.repos.getBranch({
                owner: this.owner,
                repo: this.repo,
                branch: newBranchRef,
            });
        }
        catch (errorStatus) {
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
            const commitSha = latestCommit.data.sha;
            // Now create the branch based off of the latest sha
            await this.octokit.rest.git.createRef({
                owner: this.owner,
                repo: this.repo,
                ref: newBranchRef,
                sha: commitSha,
            });
        }
        else {
            // If the branch does already exist, update it if it has a pull request
            let pullRequestData = await this.octokit.rest.pulls.list({
                owner: this.owner,
                repo: this.repo,
            });
            const prList = pullRequestData.data;
            if (prList.length > 0) {
                const prNumber = prList[0].number; // There sould only be 1 pr here
                this.octokit.rest.pulls.updateBranch({
                    owner: this.owner,
                    repo: this.repo,
                    pull_number: prNumber,
                });
            }
        }
    }
    // Checkout the branch, fetch, and pull
    async setupBranchLocally(targetBranch) {
        // Checkout the branch!
        await this.git.fetch();
        console.log(this.git.branch(['-r']));
        await this.git.checkout(targetBranch);
        const branch = await this.git.branch();
        const currentBranch = branch.current;
        console.log(currentBranch);
        // Ensure recent changes exist locally
        await this.git.fetch();
        await this.git.pull();
    }
    // Commit any local changes to the current branch locally
    async commitLocal(commitMessage) {
        // Make changes, commit, and push
        await this.git.add('*'); // Add all changed files
        await this.git.commit(commitMessage); // Commit the changed files
        // Push the changes to the checked out branch
        await this.git.push();
        console.log('Push + test some stuff out');
    }
    async createPullRequest(targetBranch, title, body) {
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
            }
            else { // PR exists, try updating
                const prNumber = prList[0].number; // There sould only be 1 pr here
                await this.octokit.rest.pulls.update({
                    owner: this.owner,
                    repo: this.repo,
                    pull_number: prNumber,
                    title: title,
                    body: body, // Kept getting errors without a body?
                });
                console.log('Updated a Pull Request');
            }
        }
        catch (pullError) {
            console.log('Pull Request not created or updated, no new changes');
            console.log(pullError);
        }
    }
    // Leverage Github API and environment variables to access files touched by Pull Requests
    static async getFiles(githubKey) {
        let fileList = [];
        const directory = GithubUtils.getGithubDirectory();
        // Only run on Pull Requests
        if (!GithubUtils.isGithubEventSchedule()) {
            const pullRequestNum = GithubUtils.getPullRequestNum();
            const githubOwner = GithubUtils.getRepoOwner();
            const repoName = GithubUtils.getRepoName();
            console.log(`Checking out ${githubOwner}:${repoName} on Pull Request ${pullRequestNum}`);
            const retries = 7;
            (0, axios_retry_1.default)(axios_1.default, {
                retries: retries,
            });
            const timeout = 2000000;
            // Do a GITHUB API Get request for the specific pull that triggered the workflow
            // Use that to get the touched files
            let result;
            try {
                result = await axios_1.default.get(`https://api.github.com/repos/${githubOwner}/${repoName}/pulls/${pullRequestNum}/files`, {
                    headers: {
                        'Authorization': `Bearer ${githubKey}`,
                        'Accept': 'application/vnd.github+json',
                        'Content-Type': 'application/json',
                    },
                    timeout: timeout,
                    data: {
                        'per_page': 100,
                        'page': 1,
                    }
                });
            }
            catch (e) {
                result = e?.response;
                throw Error(`Error Requesting after ${retries} attempts`);
            }
            console.log('Picking up Files ☺');
            fileList = (0, FileUtils_1.parsePullRequestData)(result?.data, directory);
            console.log('Finished picking up Files ☺\n');
        }
        else {
            fileList = await (0, FileUtils_1.scanFiles)(directory); // No need to do a Get request, just check locally
        }
        for (const fileDir of fileList) {
            // Output a valid file found, wrap it with ANSI Green
            console.log(`\t${Utils_1.ForegroundColor.Green}${fileDir}${Utils_1.ColorReset}`);
        }
        return fileList;
    }
    // Static functions that use environment variables from Github workflow
    static getGithubDirectory() {
        return process.env.GITHUB_WORKSPACE;
    }
    static getGithubEventName() {
        return process.env.GITHUB_EVENT_NAME;
    }
    static isGithubEventSchedule() {
        return this.getGithubEventName() == 'schedule';
    }
    static getRepoOwner() {
        const repo = process.env.GITHUB_REPOSITORY.split('/'); // owner/repo
        return repo[0];
    }
    static getRepoName() {
        const repo = process.env.GITHUB_REPOSITORY.split('/'); // owner/repo
        return repo[1];
    }
    static getPullRequestNum() {
        const githubRef = process.env.GITHUB_REF.split('/'); // refs/pulls/pr_num/merge
        return githubRef[2];
    }
    static getRefName() {
        const githubRefName = process.env.GITHUB_REF_NAME;
        return githubRefName;
    }
}
exports.default = GithubUtils;
//# sourceMappingURL=GithubUtils.js.map