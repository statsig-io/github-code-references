"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GateData_1 = require("./GateData");
const DynamicConfigData_1 = require("./DynamicConfigData");
const FileUtils_1 = require("./FileUtils");
const FileUtils_2 = require("./FileUtils");
const Utils_1 = require("./Utils");
const FeatureGate = 'feature_gates';
const DynamicConfig = 'dynamic_configs';
// Calls the endpoint using the API key and gets the projects info
async function getProjectData() {
    let projectRes;
    const sdkKey = Utils_1.default.getKey();
    const githubKey = Utils_1.default.getGithubKey();
    // Scan files for all gates that could be in them
    // Get the file, the line, and the gate name for each gate and dynamic config
    let fileNames = await (0, FileUtils_1.default)(githubKey);
    let allGates = [];
    for (const file of fileNames) {
        const gatesFound = (0, FileUtils_2.searchGatesInFile)(file);
        const fileName = file.split('/').at(-1);
        const gateData = new GateData_1.default(file, fileName, gatesFound);
        if (gatesFound.length >= 1) {
            allGates.push(gateData);
        }
    }
    let allConfigs = [];
    for (const file of fileNames) {
        const configsFound = (0, FileUtils_1.searchConfigsInFile)(file);
        const fileName = file.split('/').at(-1);
        const configData = new DynamicConfigData_1.default(file, fileName, configsFound);
        if (configsFound.length >= 1) {
            allConfigs.push(configData);
        }
    }
    // Post request to the project with the input API key
    // Collect gates into map where the key is the gate name
    const timeout = 250000;
    projectRes = await Utils_1.default.requestProjectData(sdkKey, timeout);
    const data = projectRes?.data; // Axios response returns a data object
    const parsedGateData = Utils_1.default.parseProjectData(data, FeatureGate); // Map of gate names to gate info
    // Map of dynamic config names to config info
    const parsedConfigData = Utils_1.default.parseProjectData(data, DynamicConfig);
    // Get data only on the feature gates found within the local files
    allGates.forEach(function (fileWithGates) {
        let updatedGates = [];
        fileWithGates.gates.forEach(function (gate) {
            // The gates found on local files should match gates existing on statsig api
            console.log('Checking Gate:', gate.gateName);
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
                };
            }
            updatedGates.push(gate); // Add to the new list of gates for this specific file
        });
        fileWithGates.gates = updatedGates;
    });
    // Get data only on the dynamic configs in local files
    for (let fileWithConfigs of allConfigs) {
        let updatedConfigs = [];
        for (let config of fileWithConfigs.dynamicConfigs) {
            // The gates found on local files should match gates existing on statsig api
            console.log('Checking Dynamic Config:', config.configName);
            if (parsedConfigData.has(config.configName)) {
                // Get the respective gate from project data
                let projectGate = parsedConfigData.get(config.configName);
                // gate is of type Gate, defined in GateData.ts
                // To add more properties change the Gate object
                config = {
                    'line': config.line,
                    'configName': config.configName,
                    'enabled': projectGate['enabled'],
                    'defaultValue': projectGate['defaultValue'],
                    'checksInPast30Days': projectGate['checksInPast30Days'],
                };
            }
            updatedConfigs.push(config); // Add to the new list of gates for this specific file
        }
        fileWithConfigs.dynamicConfigs = updatedConfigs;
    }
    Utils_1.default.outputFinalGateData(allGates);
    Utils_1.default.outputFinalConfigData(allConfigs);
}
exports.default = getProjectData;
getProjectData();
//# sourceMappingURL=ProjectData.js.map