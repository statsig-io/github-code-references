"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const GateData_1 = require("./GateData");
const FileUtils_1 = require("./FileUtils");
const FileUtils_2 = require("./FileUtils");
const axios_retry_1 = require("axios-retry");
const Utils_1 = require("./Utils");
const core = require("@actions/core");
(0, axios_retry_1.default)(axios_1.default, {
    retries: 7,
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
        projectRes = await axios_1.default.post('https://statsigapi.net/developer/v1/projects', null, {
            headers: {
                "statsig-api-key": `6wdiBivL3kECj1ducAZrc4:Ie1nOKs9KVAkCOwPnPiiUjCdipPPXAW0yVZNvHFQq6h`,
                'Content-Type': 'application/json',
            },
            timeout: 100000,
        });
    }
    catch (e) {
        projectRes = e?.response;
        console.log("Error Requesting after 8 attempts");
    }
    const data = projectRes?.data;
    const cleanedData = Utils_1.default.parseProjects(data); // Map of all the gates from the project
    // Get data only on the feature gates found within the local files
    allGates.forEach(function (file) {
        let updatedGates = [];
        file.gates.forEach(function (gate) {
            // Get the respective gate from project data
            let projectGate = cleanedData.get(gate.gateName);
            gate = {
                'line': gate.line,
                'gateName': gate.gateName,
                'enabled': projectGate['enabled'],
                'defaultValue': projectGate['defaultValue'],
            };
            updatedGates.push(gate); // Add to the new list of gates for this specific file
        });
        file.gates = updatedGates;
    });
    Utils_1.default.outputFinalGateData(allGates);
    core.setOutput("project-data", ':)');
}
exports.default = getProjectData;
getProjectData();
//# sourceMappingURL=ProjectData.js.map