import { AxiosResponse } from 'axios';
import GateData from './GateData'
import DynamicConfigData from './DynamicConfigData';
import getFiles, { searchConfigsInFile } from './FileUtils'
import { searchGatesInFile } from './FileUtils';
import Utils from './Utils'

export const FeatureGate = 'feature_gates'
export const DynamicConfig = 'dynamic_configs'

// Calls the endpoint using the API key and gets the projects info
export default async function getProjectData() {
    
    let projectRes: AxiosResponse | undefined;
    const sdkKey = Utils.getKey();
    const githubKey = Utils.getGithubKey();

    // Scan files for all gates that could be in them
    // Get the file, the line, and the gate name for each gate and dynamic config
    let fileNames = await getFiles(githubKey);
    let allGates: GateData[] = [];
    for (const file of fileNames) {
        const gatesFound = searchGatesInFile(file);
        const fileName = file.split('/').at(-1);
        const gateData = new GateData(file, fileName, gatesFound);

        if (gatesFound.length >= 1) {
            allGates.push(gateData);
        }
    }

    let allConfigs: DynamicConfigData[] = [];
    for (const file of fileNames) {
        const configsFound = searchConfigsInFile(file);
        const fileName = file.split('/').at(-1);
        const configData = new DynamicConfigData(file, fileName, configsFound);

        if (configsFound.length >= 1) {
            allConfigs.push(configData);
        }
    }
    
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
    for (let fileWithGates of allGates) {
        let updatedGates = [];

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
                }
                // Only push gate is valid, invalid gates can be caught because of my regex :)
                updatedGates.push(gate) // Add to the new list of gates for this specific file
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

    // Create a Pull Request using GITHUB API only when scheduled, test for now to get info
    // dummy comment
    Utils.createGithubPullRequest(githubKey);
}

getProjectData();