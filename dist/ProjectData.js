"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicConfig = exports.FeatureGate = void 0;
const FileUtils_1 = require("./utils/FileUtils");
const Utils_1 = require("./utils/Utils");
const GithubUtils_1 = require("./utils/GithubUtils");
exports.FeatureGate = 'feature_gates';
exports.DynamicConfig = 'dynamic_configs';
function isGateStale(gateType) {
    const types = new Set(['STALE_PROBABLY_LAUNCHED', 'STALE_PROBABLY_UNLAUNCHED',
        'STALE_NO_RULES', 'STALE_PROBABLY_DEAD']);
    return types.has(gateType);
}
// Calls the endpoint using the API key and gets the projects info
async function getProjectData() {
    let projectRes;
    const sdkKey = Utils_1.default.getKey();
    const githubKey = Utils_1.default.getGithubKey();
    // Scan files for all gates that could be in them
    // Get the file, the line, and the gate name for each gate and dynamic config
    let fileNames = await GithubUtils_1.default.getFiles(githubKey);
    let allGates = (0, FileUtils_1.getFeatureGatesInFiles)(fileNames);
    let allConfigs = (0, FileUtils_1.getDynamicConfigsInFiles)(fileNames);
    // Post request to the project with the input API key
    // Collect gates into map where the key is the gate name
    const timeout = 250000;
    projectRes = await Utils_1.default.requestProjectData(sdkKey, timeout);
    const data = projectRes?.data; // Axios response returns a data object
    const parsedGateData = Utils_1.default.parseProjectData(data, exports.FeatureGate); // Map of gate names to gate info
    // Map of dynamic config names to config info
    const parsedConfigData = Utils_1.default.parseProjectData(data, exports.DynamicConfig);
    // Get data only on the feature gates found within the local files
    let finalGates = [];
    let staleGates = new Map; // fileName, gateName
    for (let fileWithGates of allGates) {
        let updatedGates = [];
        ``;
        for (let gate of fileWithGates.gates) {
            // The gates found on local files should match gates existing on statsig api
            if (parsedGateData.has(gate.gateName)) {
                // Get the respective gate from project data
                let projectGate = parsedGateData.get(gate.gateName);
                // gate is of type Gate, defined in GateData.ts
                // To add more properties change the Gate object
                gate = {
                    'line': gate.line,
                    'gateName': gate.gateName,
                    'enabled': projectGate['enabled'],
                    'defaultValue': projectGate['defaultValue'],
                    'checksInPast30Days': projectGate['checksInPast30Days'],
                    'gateType': projectGate['gateType'].type,
                    'gateTypeReason': projectGate['gateType'].type
                };
                updatedGates.push(gate);
                // Create the map
                // if (isGateStale(gate.gateType.reason)) { Test on Temporary gates
                console.log(gate.gateTypeReason);
                if (gate.gateTypeReason == "TEMPORARY") {
                    const fileDir = fileWithGates.fileDir;
                    if (staleGates.has(fileDir)) {
                        staleGates.get(fileDir).push(gate.gateName);
                    }
                    else {
                        staleGates.set(fileDir, [gate.gateName]);
                    }
                }
            }
        }
        // In the case a file had no good gates (regex caught something wrong) don't include it
        if (updatedGates.length > 0) {
            fileWithGates.gates = updatedGates;
            finalGates.push(fileWithGates);
        }
    }
    // Get data only on the dynamic configs in local files
    let finalConfigs = [];
    for (let fileWithConfigs of allConfigs) {
        let updatedConfigs = [];
        for (let config of fileWithConfigs.dynamicConfigs) {
            // The configs found on local files should match gates existing on statsig api
            if (parsedConfigData.has(config.configName)) {
                // Get the respective gate from project data
                let projectGate = parsedConfigData.get(config.configName);
                // config is of type DynamicConfig, defined in DynamicConfigData.ts
                // To add more properties change the DynamicConfig object
                config = {
                    'line': config.line,
                    'configName': config.configName,
                    'enabled': projectGate['enabled'],
                    'defaultValue': projectGate['defaultValue'],
                    'checksInPast30Days': projectGate['checksInPast30Days'],
                };
                updatedConfigs.push(config); // Add to the new list of gates for this specific file
            }
        }
        // In the case a file had no good configs (regex caught something wrong) don't include it
        if (updatedConfigs.length > 0) {
            fileWithConfigs.dynamicConfigs = updatedConfigs;
            finalConfigs.push(fileWithConfigs);
        }
    }
    Utils_1.default.outputFinalGateData(finalGates);
    Utils_1.default.outputFinalConfigData(finalConfigs);
    // Create a Pull Request using GITHUB API only when scheduled
    if (GithubUtils_1.default.isGithubEventSchedule()) {
        console.log(`\n Creating a Pull Request`);
        const repoOwner = GithubUtils_1.default.getRepoOwner();
        const repoName = GithubUtils_1.default.getRepoName();
        const mainBranch = GithubUtils_1.default.getRefName();
        const cleanBranchName = `Statsig-Cleaned-Gates`;
        let githubUtil = new GithubUtils_1.default(githubKey, repoOwner, repoName, mainBranch);
        // Set up the branch
        console.log('Set up the Clean Branch');
        const cleanBranchRef = `refs/heads/${cleanBranchName}`;
        await githubUtil.configureBranch(cleanBranchRef);
        // Checkout the branch
        console.log('Checkout the Clean Branch');
        await githubUtil.setupBranchLocally(cleanBranchName);
        // Scan and clean stale gates
        console.log('Scan and Clean the Gates');
        staleGates.forEach((staleGates, fileDir) => {
            (0, FileUtils_1.replaceStaleGates)(staleGates, fileDir);
            console.log(staleGates);
        });
        // Commit and update the local branch
        const message = "Clean stale gates and configs";
        await githubUtil.commitLocal(message);
        // Create the Pull Request or Update it
        const currDate = new Date().toISOString().slice(0, 10); // Creates date in 2023-06-09 format
        const pullRequestTitle = `${cleanBranchName} ${currDate}`;
        const pullRequestBody = "Replace stale gates and configs with corresponding flags or empty objects";
        await githubUtil.createPullRequest(cleanBranchName, pullRequestTitle, pullRequestBody);
    }
}
exports.default = getProjectData;
getProjectData();
//# sourceMappingURL=ProjectData.js.map