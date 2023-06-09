import { Octokit } from "@octokit/rest";
import simpleGit from "simple-git";
import { replaceStaleGates, replaceStaleConfigs } from "./FileUtils";

const octokit = new Octokit({
    auth: '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'
})

const owner = 'statsig-io';
const repo = 'github-code-references';
const statsig_clean_branch_ref = 'refs/heads/Clean-Statsig-Gate';
const statsig_clean_branch = 'Clean-Statsig-Gate';
const main_branch = 'main' // This will be an environment variable given by the gitub workflow
const git = simpleGit('')

async function testGithubApi() {

    // Step 1: Check if Clean-Statsiog-Gates exists
    // Create it if it doesn't exist
    let status;
    try {
        status = await octokit.rest.repos.getBranch(
            {
                owner: owner,
                repo: repo,
                branch: statsig_clean_branch_ref,
            }
        );
    } catch (errorStatus) {

        status = errorStatus;
    }

    status = status.status;
    console.log(status);

    // Step 1a
    // If it doesn't exist, create the branch
    if (status == 404) {

        // First get the latest commit
        // octokit.rest.repo.getCommit() was not working for some reason
        // ^ it was because I didn't name the repo right :)
        const latestCommit = await octokit.rest.repos.getCommit({
            owner: owner,
            repo: repo,
            ref: main_branch,
            headers: {
                Accept: 'sha',
            }
          });

        const commitSha = latestCommit.data.sha
        console.log('latestcommit:', commitSha);

        // Now create the branch based off of the latest sha
        await octokit.rest.git.createRef({
            owner: owner,
            repo: repo,
            ref: statsig_clean_branch_ref,
            sha: commitSha,
          });
    }
    
    // Step 2: Checkout the branch!
    await git.checkout(statsig_clean_branch);
    const branch = await git.branch();
    const currentBranch = branch.current;
    console.log(currentBranch);

    // Step 3: Make changes, commit, and push
    // Step 3a: Match and substitute a test gate /tests/stale_gates.ts
    const test_file_loc = "./tests/stale_gates.ts"
    replaceStaleGates(test_file_loc);
    replaceStaleConfigs(test_file_loc);

    // Step 3b: Make a commit
    const commitMessage = "Replaced stale gates and configs";
    git.commit(commitMessage);

    // Step 3c: Push the changes to the checked out branch -> Clean-Statsig-Gates
    git.push()
}

testGithubApi();