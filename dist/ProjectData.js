"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const GateData_1 = require("./GateData");
const FileUtils_1 = require("./FileUtils");
const FileUtils_2 = require("./FileUtils");
const axios_retry_1 = require("axios-retry");
const Utils_1 = require("./Utils");
const retries = 7;
(0, axios_retry_1.default)(axios_1.default, {
    retries: retries,
});
// Calls the endpoint using the API key and gets the projects info
async function getProjectData() {
    let projectRes;
    const sdkKey = Utils_1.default.getKey();
    // Scan files for all gates that could be in them
    // Get the file, the line, and the gate name for each gate
    let fileNames = await (0, FileUtils_1.default)();
    let allGates = [];
    fileNames.forEach((file) => {
        const gatesFound = (0, FileUtils_2.searchFile)(file);
        const fileName = file.split('/').at(-1);
        const gateData = new GateData_1.default(file, fileName, gatesFound);
        if (gatesFound.length >= 1) {
            allGates.push(gateData);
        }
    });
    // Post request to the project with the input API key
    // Collect gates into map where the key is the gate name
    try {
        projectRes = await axios_1.default.post('https:/latest.statsigapi.net/developer/v1/projects', null, {
            headers: {
                'statsig-api-key': sdkKey,
                'Content-Type': 'application/json',
            },
            timeout: 200000, // Sometimes the delay is greater than the speed GH workflows can get the data
        });
    }
    catch (e) {
        projectRes = e?.response;
        throw Error(`Error Requesting after ${retries} attempts`);
    }
    const data = projectRes?.data;
    const parsedData = Utils_1.default.parseProjects(data); // Map of gate names to gate info
    // Get data only on the feature gates found within the local files
    allGates.forEach(function (fileWithGates) {
        let updatedGates = [];
        fileWithGates.gates.forEach(function (gate) {
            // The gates found on local files should match gates existing on statsig api
            if (!parsedData.has(gate.gateName)) {
                throw Error(`Gate ${gate.gateName} could not be found`);
            }
            // Get the respective gate from project data
            let projectGate = parsedData.get(gate.gateName);
            // gate is of type Gate, defined in GateData.ts
            // To add more properties change the GateData object
            gate = {
                'line': gate.line,
                'gateName': gate.gateName,
                'enabled': projectGate['enabled'],
                'defaultValue': projectGate['defaultValue'],
                'checksInPast30Days': projectGate['checksInPast30Days'],
            };
            updatedGates.push(gate); // Add to the new list of gates for this specific file
        });
        fileWithGates.gates = updatedGates;
    });
    Utils_1.default.outputFinalGateData(allGates);
}
exports.default = getProjectData;
getProjectData();
//# sourceMappingURL=ProjectData.js.map