"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const axios_retry_1 = require("axios-retry");
const Utils_1 = require("./Utils");
const core = require("@actions/core");
(0, axios_retry_1.default)(axios_1.default, {
    retries: 3,
});
// Calls the endpoint using the API key and gets the projects info
async function getProjectData() {
    let projectRes;
    const key = Utils_1.default.getKey();
    try {
        projectRes = await axios_1.default.post('https://statsigapi.net/developer/v1/projects', null, {
            headers: {
                "statsig-api-key": key,
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
    console.log(cleanedData);
    core.setOutput("project-data", data);
}
exports.default = getProjectData;
getProjectData();
//# sourceMappingURL=ProjectData.js.map