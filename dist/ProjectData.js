"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
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
    try {
        projectRes = await axios_1.default.post("http://localhost:3006/developer/v1/projects", null, {
            headers: {
                "statsig-api-key": "secret-08Bqk5wabXasJhcw5fVVIQ1JUfwBI8IXnAPMqbvaBkS",
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        });
    }
    catch (e) {
        projectRes = e?.response;
        console.log("Error Requesting after 4 attempts");
    }
    const data = projectRes?.data;
    const cleanedData = Utils_1.default.parseProjects(data);
    if (cleanedData) {
        // Print out each item which consists of feature_gate name, enabled/disabled, default val
        cleanedData.forEach(function (item) {
            console.log(`name: ${item.name}, enabled: ${item.enabled}, defaultVal: ${item.defaultValue}`);
        });
    }
    else {
        console.log(`Could not access the data`);
    }
    core.setOutput("project-data", cleanedData);
}
exports.default = getProjectData;
getProjectData();
//# sourceMappingURL=ProjectData.js.map