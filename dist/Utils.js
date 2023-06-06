"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core = require("@actions/core");
const axios_1 = require("axios");
const axios_retry_1 = require("axios-retry");
class Utils {
    static getKey() {
        const sdkKey = this.parseInputKey("sdk-key", true);
        core.setSecret(sdkKey);
        return sdkKey;
    }
    static getGithubKey() {
        const githubKey = this.parseInputKey("github-key", true);
        core.setSecret(githubKey);
        return githubKey;
    }
    // Parses the input for the action.yml file
    static parseInputKey(key, required = false, defaultValue = "") {
        try {
            return core.getInput(key, { required: required });
        }
        catch (e) {
            core.setFailed(`Invalid Input (${key}): ${e.message}`);
        }
        return defaultValue;
    }
    static async requestProjectData(sdkKey, timeout) {
        const retries = 7;
        (0, axios_retry_1.default)(axios_1.default, {
            retries: retries,
        });
        // Post request can fail occassionally, catch this and throw the error if so
        let result;
        try {
            result = await axios_1.default.post('https:/latest.statsigapi.net/developer/v1/projects', // This will change to prod when completed
            null, {
                headers: {
                    'statsig-api-key': sdkKey,
                    'Content-Type': 'application/json',
                },
                timeout: timeout, // Sometimes the delay is greater than the speed GH workflows can get the data
            });
        }
        catch (e) {
            result = e?.response;
            throw Error(`Error Requesting after ${retries} attempts`);
        }
        return result;
    }
    ;
    // Parses through statsig project data for targetType (Feature Gates or Dynamic Configs)
    static parseProjectData(data, targetType) {
        if (!data) {
            return null;
        }
        let projectData = data["projects"];
        let allTypeInfo = new Map;
        // Loop over every project in data
        for (const project of projectData) {
            for (const target of project[targetType]) { // Either Feature Gates or Dynamic Configs
                allTypeInfo.set(target["name"], {
                    "enabled": target["enabled"],
                    "defaultValue": target["defaultValue"],
                    "checksInPast30Days": target["checksInPast30Days"],
                });
            }
        }
        return allTypeInfo;
    }
    ;
    // Controls the format of the gate outputs
    static outputFinalGateData(allGateData) {
        console.log('---------- Feature Gates ----------');
        for (const gateData of allGateData) {
            console.log('File:', gateData.fileName);
            console.log('Location:', gateData.fileDir);
            for (const gate of gateData.gates) {
                console.log(`\t Gate: ${gate.gateName}`);
                // Print all necessary gate properities
                for (const gateProp in gate) {
                    if (gateProp != 'gateName') { // Already printed name above, do not reprint
                        console.log(`\t\t${gateProp}: ${gate[gateProp]}`);
                    }
                }
                console.log(); // Leave a space between each Gate and file
            }
        }
    }
    static outputFinalConfigData(allConfigData) {
        console.log('---------- Dynamic Configs ----------');
        // Iterate over every file with configs
        for (const configData of allConfigData) {
            console.log('File:', configData.fileName);
            console.log('Location:', configData.fileDir);
            // Get a specific dynamic config within that file
            for (const config of configData.dynamicConfigs) {
                Utils.outputDynamicConfig(config);
            }
        }
    }
    // Output an individual DynamicConfig objects data
    static outputDynamicConfig(config) {
        console.log(`\t Dynamic Config: ${config.configName}`, 'color: blue');
        // Print all necessary config properities
        for (const configProp in config) {
            // Already printed name above, do not reprint
            if (configProp != 'configName' && configProp != 'defaultValue') {
                console.log(`\t\t${configProp}: ${config[configProp]}`);
            }
            else if (configProp == 'defaultValue') { // Default value for Dynamic Configs are objects
                const defaultValues = config[configProp];
                console.log(`\t\tDefaultValues:`);
                for (const value in defaultValues) {
                    console.log(`\t\t\t${value}: ${defaultValues[value]}`);
                }
            }
        }
        console.log(); // Leave a space between each Gate and file
    }
}
exports.default = Utils;
//# sourceMappingURL=Utils.js.map