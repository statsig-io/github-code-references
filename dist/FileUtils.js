"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchConfigsInFile = exports.searchGatesInFile = exports.parsePullRequestData = void 0;
const fs = require("fs");
const Utils_1 = require("./Utils");
const axios_retry_1 = require("axios-retry");
const axios_1 = require("axios");
// Not worth checking files that won't have feature gates
const extensionIgnoreList = new Set(['git', 'yaml', 'yml', 'json', 'github', 'gitignore', 'md', 'map']);
// Add to these overtime
const allowedExtensions = new Set(['ts', 'py', 'js']);
const extensionToGateRegexMap = new Map([
    ["ts", /checkGate\([\w ,]*['"]?(?<gateName>[\w _-]*)['"]?\)/i],
    ["js", /checkGate\([\w ,]*['"]?(?<gateName>[\w _-]*)['"]?\)/i],
    ["py", /check_gate\(.*, *['"]?(?<gateName>[\w _-]*)['"]?\)/i],
]);
const extensionToConfigRegexMap = new Map([
    ["ts", /getConfig\(.*, ?['"]?(?<configName>.*)['"]\)/i],
    ["js", /getConfig\(.*, ?['"]?(?<configName>.*)['"]\)/i],
    ["py", /get_config\(.*, ['"]?(?<configName>.*)['"]\)/i],
]);
// Leverage Github API and environment variables to access files touched by Pull Requests
async function getFiles(githubKey) {
    const directory = process.env.GITHUB_WORKSPACE;
    const githubRepo = process.env.GITHUB_REPOSITORY.split('/'); // refs/pulls/pr_num/merge
    const githubRef = process.env.GITHUB_REF.split('/'); // owner/repo
    // const directory = '/Users/jairogarciga/Github-Code-References/github-code-references'
    const pullRequestNum = githubRef[2];
    const githubOwner = githubRepo[0];
    const repoName = githubRepo[1];
    console.log(`Checking out ${githubRepo} on Pull Request ${pullRequestNum}`);
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
    const fileList = parsePullRequestData(result?.data, directory);
    console.log('Finished picking up Files ☺\n');
    return fileList;
}
exports.default = getFiles;
// Get the file locations based on the pull request data from the Github API
function parsePullRequestData(data, mainDirectory) {
    let fileLocations = [];
    for (const pullRequestFile of data) {
        const fileName = pullRequestFile['filename'];
        const fileExtension = fileName.split('.').at(-1);
        const fileStatus = pullRequestFile['status'];
        // Check if file has a valid extension for checking or if it has been deleted
        if (!extensionIgnoreList.has(fileExtension) && fileStatus != 'removed') {
            const completeFileDir = `${mainDirectory}/${fileName}`;
            fileLocations.push(completeFileDir);
            // Output a valid file found, wrap it with ANSI Green
            console.log(`\t${Utils_1.ForegroundColor.Green}${completeFileDir}${Utils_1.ColorReset}`);
        }
    }
    return fileLocations;
}
exports.parsePullRequestData = parsePullRequestData;
// Searched solely for Feature Gates
function searchGatesInFile(fileDir) {
    // Assume in typescript or Python only for now
    let gatesFound = [];
    const regex = '';
    // Split current directory based on .
    const splitDir = fileDir.split('.');
    const extension = splitDir.at(-1);
    if (allowedExtensions.has(extension)) {
        // Read within the file for the target string
        const fileData = fs.readFileSync(fileDir, 'utf-8');
        const lineDividedData = fileData.split('\n');
        // Different languages, clients, servers have differentw ways of creating gates
        // Different regex target each instead of using one big regex blob
        const regex = extensionToGateRegexMap.get(extension);
        // Loop over each line, regex search for the 
        for (let line = 0; line < lineDividedData.length; line++) {
            const currLine = lineDividedData[line];
            const found = currLine.match(regex);
            // If a gate exists in a file, add to the list of total gates found
            if (found) {
                const gateName = found.groups.gateName;
                gatesFound.push({
                    'line': line.toString(),
                    'gateName': gateName,
                });
            }
        }
    }
    return gatesFound;
}
exports.searchGatesInFile = searchGatesInFile;
// Searched solely for Feature Gates
function searchConfigsInFile(fileDir) {
    // Assume in typescript or Python only for now
    let configsFound = [];
    const regex = '';
    // Split current directory based on .
    const splitDir = fileDir.split('.');
    const extension = splitDir.at(-1);
    if (allowedExtensions.has(extension)) {
        // Read within the file for the target string
        const fileData = fs.readFileSync(fileDir, 'utf-8');
        const lineDividedData = fileData.split('\n');
        // Different languages, clients, servers have differentw ways of creating gates
        // Different regex target each instead of using one big regex blob
        const regex = new RegExp(extensionToConfigRegexMap.get(extension));
        // Loop over each line, regex search for the 
        for (let line = 0; line < lineDividedData.length; line++) {
            const currLine = lineDividedData[line];
            const found = currLine.match(regex);
            // If a gate exists in a file, add to the list of total gates found
            if (found) {
                const configName = found.groups.configName;
                configsFound.push({
                    'line': line.toString(),
                    'configName': configName,
                });
            }
        }
    }
    return configsFound;
}
exports.searchConfigsInFile = searchConfigsInFile;
//# sourceMappingURL=FileUtils.js.map