import { AxiosResponse } from 'axios';
import GateData from './data_classes/GateData'
import DynamicConfigData from './data_classes/DynamicConfigData';
import { getDynamicConfigsInFiles, getFeatureGatesInFiles, replaceStaleGates } from './utils/FileUtils'
import Utils from './utils/Utils'
import GithubUtils from './utils/GithubUtils'

export const FeatureGate = 'feature_gates'
export const DynamicConfig = 'dynamic_configs'

function isGateStale(gateType: string) {
    const types = new Set<string>(['STALE_PROBABLY_LAUNCHED', 'STALE_PROBABLY_UNLAUNCHED',
                                    'STALE_NO_RULES', 'STALE_PROBABLY_DEAD'])
    return types.has(gateType);
}

// Calls the endpoint using the API key and gets the projects info
export default async function getProjectData() {
    
    let projectRes: AxiosResponse | undefined;
    const sdkKey = Utils.getKey();
    const githubKey = Utils.getGithubKey();

    // Scan files for all gates that could be in them
    // Get the file, the line, and the gate name for each gate and dynamic config
    let fileNames = await GithubUtils.getFiles(githubKey);
    let allGates: GateData[] = getFeatureGatesInFiles(fileNames)
    let allConfigs: DynamicConfigData[] = getDynamicConfigsInFiles(fileNames);
    
    // Post request to the project with the input API key
    // Collect gates into map where the key is the gate name
    const timeout = 250000;
    projectRes = await Utils.requestProjectData(sdkKey, timeout);

    const data = projectRes?.data; // Axios response returns a data object
    const parsedGateData = Utils.parseProjectData(data, FeatureGate); // Map of gate names to gate info
    // Map of dynamic config names to config info
    const parsedConfigData = Utils.parseProjectData(data, DynamicConfig);

    // Get data only on the feature gates found within the local files
    let finalGates: GateData[] = [];
    let staleGates = new Map<string, string[]>; // fileName, gateName
    for (let fileWithGates of allGates) {
        let updatedGates = [];
``
        for (let gate of fileWithGates.gates) {
            // The gates found on local files should match gates existing on statsig api
            
            if (parsedGateData.has(gate.gateName)) {
                // Get the respective gate from project data
                let projectGate = parsedGateData.get(gate.gateName)
            
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
                }

                updatedGates.push(gate) 

                // Create the map
                // if (isGateStale(gate.gateType.reason)) { Test on Temporary gates
                console.log(gate.gateTypeReason);
                if (gate.gateTypeReason == "TEMPORARY") {
                    const fileDir = fileWithGates.fileDir;

                    if (staleGates.has(fileDir)) {
                        staleGates.get(fileDir).push(gate.gateName);
                    } else {
                        staleGates.set(fileDir, [gate.gateName])
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
    let finalConfigs: DynamicConfigData[] = [];
    for (let fileWithConfigs of allConfigs) {
        let updatedConfigs = [];

        for (let config of fileWithConfigs.dynamicConfigs) {
            
            // The configs found on local files should match gates existing on statsig api
            if (parsedConfigData.has(config.configName)) {

                // Get the respective gate from project data
                let projectGate = parsedConfigData.get(config.configName)
            
                // config is of type DynamicConfig, defined in DynamicConfigData.ts
                // To add more properties change the DynamicConfig object
                config = {
                    'line': config.line,
                    'configName': config.configName,
                    'enabled': projectGate['enabled'],
                    'defaultValue': projectGate['defaultValue'],
                    'checksInPast30Days': projectGate['checksInPast30Days'],
                }
                updatedConfigs.push(config) // Add to the new list of gates for this specific file
            } 
        }

        // In the case a file had no good configs (regex caught something wrong) don't include it
        if (updatedConfigs.length > 0) {
            fileWithConfigs.dynamicConfigs = updatedConfigs;
            finalConfigs.push(fileWithConfigs);
        }
    }

    Utils.outputFinalGateData(finalGates);
    Utils.outputFinalConfigData(finalConfigs);

    // Create a Pull Request using GITHUB API only when scheduled
    if (GithubUtils.isGithubEventSchedule()) {
        console.log(`\n Creating a Pull Request`)

        const repoOwner = GithubUtils.getRepoOwner();
        const repoName = GithubUtils.getRepoName();
        const mainBranch = GithubUtils.getRefName();
        const cleanBranchName = `Statsig-Cleaned-Gates`

        let githubUtil = new GithubUtils(githubKey, repoOwner, repoName, mainBranch);

        // Set up the branch
        console.log('Set up the Clean Branch');
        const cleanBranchRef = `refs/heads/${cleanBranchName}`
        await githubUtil.configureBranch(cleanBranchRef);

        // Checkout the branch
        console.log('Checkout the Clean Branch')
        await githubUtil.setupBranchLocally(cleanBranchName);
        
        // Scan and clean stale gates
        console.log('Scan and Clean the Gates');
        staleGates.forEach((staleGates, fileDir) => {
            replaceStaleGates(staleGates, fileDir);
        })

        // Commit and update the local branch
        const message = "Clean stale gates and configs"
        await githubUtil.commitLocal(message);

        // Create the Pull Request or Update it
        const currDate = new Date().toISOString().slice(0, 10); // Creates date in 2023-06-09 format
        const pullRequestTitle = `${cleanBranchName} ${currDate}`;
        const pullRequestBody = "Replace stale gates and configs with corresponding flags or empty objects";
        await githubUtil.createPullRequest(cleanBranchName, pullRequestTitle, pullRequestBody);
    }
}

getProjectData();