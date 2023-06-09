"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rest_1 = require("@octokit/rest");
const simple_git_1 = require("simple-git");
const FileUtils_1 = require("./FileUtils");
const octokit = new rest_1.Octokit({
    auth: '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'
});
const owner = 'statsig-io';
const repo = 'github-code-references';
const statsig_clean_branch_ref = 'refs/heads/Clean-Statsig-Gates';
const statsig_clean_branch = 'Clean-Statsig-Gates';
const main_branch = 'github-code-refs'; // This will be an environment variable given by the gitub workflow
const git = (0, simple_git_1.default)('');
async function testGithubApi() {
    // Step 1: Check if Clean-Statsiog-Gates exists
    // Create it if it doesn't exist
    let status;
    try {
        status = await octokit.rest.repos.getBranch({
            owner: owner,
            repo: repo,
            branch: statsig_clean_branch_ref,
        });
    }
    catch (errorStatus) {
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
        const commitSha = latestCommit.data.sha;
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
    // Ensure recent changes exist locally
    await git.fetch();
    await git.pull();
    // Step 3: Make changes, commit, and push
    // Step 3a: Match and substitute a test gate /tests/stale_gates.ts
    const test_file_loc = "./tests/stale_gates.ts";
    (0, FileUtils_1.replaceStaleGates)(test_file_loc);
    (0, FileUtils_1.replaceStaleConfigs)(test_file_loc);
    // Step 3b: Make a commit
    const commitMessage = "Replaced stale gates and configs";
    await git.add('*'); // Add all changed files
    await git.commit(commitMessage); // Commit the changed files
    // Step 3c: Push the changes to the checked out branch -> Clean-Statsig-Gates
    await git.push();
    console.log('Push + test some stuff out');
    // Step 4: Check if PR exists
    // Only one PR should exist on the Clean-Statsig-Gates branch
    // List all pulls to get the one we want
    const pullRequestData = await octokit.rest.pulls.list({
        owner,
        repo,
    });
    const prList = pullRequestData.data;
    console.log(prList);
    const pullRequestTitle = "Clean Stale Gates and Configs";
    try {
        // If empty make a new pr
        if (prList.length == 0) {
            await octokit.rest.pulls.create({
                owner: owner,
                repo: repo,
                title: pullRequestTitle,
                head: statsig_clean_branch,
                base: main_branch,
            });
            console.log('Created a Pull Request');
        }
        else { // PR exists, try updating
            const prNumber = prList[0].number; // There sould only be 1 pr here
            await octokit.rest.pulls.update({
                owner: owner,
                repo: repo,
                pull_number: prNumber,
            });
            console.log('Updated a Pull Request');
        }
    }
    catch (pullError) {
        console.log('Pull Request not created or updated, no new changes');
        console.log(pullError);
    }
}
testGithubApi();
//# sourceMappingURL=githubApiTest.js.map