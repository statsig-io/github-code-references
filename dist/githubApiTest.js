"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rest_1 = require("@octokit/rest");
const simple_git_1 = require("simple-git");
const octokit = new rest_1.Octokit({
    auth: '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'
});
const owner = 'statsig-io';
const repo = 'github-code-references';
const statsig_clean_branch = 'refs/heads/Clean-Statsig-Gate';
const main_branch = 'main'; // This will be an environment variable given by the gitub workflow
const git = (0, simple_git_1.default)('');
async function testGithubApi() {
    // Step 1: Check if Clean-Statsiog-Gates exists
    // Create it if it doesn't exist
    let status;
    try {
        status = await octokit.rest.repos.getBranch({
            owner: owner,
            repo: repo,
            branch: statsig_clean_branch,
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
        octokit.rest.git.createRef({
            owner: owner,
            repo: repo,
            ref: statsig_clean_branch,
            sha: commitSha,
        });
    }
    // Step 2: Checkout the branch!
    git.checkout(main_branch);
    const branch = await git.branch();
    const currentBranch = branch.current;
    console.log(currentBranch);
}
testGithubApi();
//# sourceMappingURL=githubApiTest.js.map