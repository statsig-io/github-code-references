"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const axios_retry_1 = require("axios-retry");
(0, axios_retry_1.default)(axios_1.default, {
    retries: 3,
});
// Calls the endpoint using the API key and gets the projects info
async function getProjectData() {
    let projectRes;
    try {
        projectRes = await axios_1.default.post('https://statsigapi.net/developer/v1/projects', null, {
            headers: {
                "statsig-api-key": "6wdiBivL3kECj1ducAZrc4:Ie1nOKs9KVAkCOwPnPiiUjCdipPPXAW0yVZNvHFQq6h",
                //"statsig-api-key": process.env.STATSIG_API_KEY,
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
    return data;
}
exports.default = getProjectData;
//# sourceMappingURL=ProjectData.js.map