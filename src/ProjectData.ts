import axios, { AxiosError, AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';
import Utils from './Utils'
import * as core from "@actions/core";

axiosRetry(axios, {
    retries: 3,
});

// Calls the endpoint using the API key and gets the projects info
export default async function getProjectData() {

    let projectRes: AxiosResponse | undefined;

    const key = Utils.getKey();

    try {
        projectRes = await axios.post(
            'https://statsigapi.net/developer/v1/projects',
            null,
            {
                headers: {
                    "statsig-api-key": "6wdiBivL3kECj1ducAZrc4:Ie1nOKs9KVAkCOwPnPiiUjCdipPPXAW0yVZNvHFQq6h",
                    'Content-Type': 'application/json',
                },
                timeout: 10000,
            }
        )
    } catch (e: unknown) {
        projectRes = (e as AxiosError)?.response;
        console.log("Error Requesting after 4 attempts")
    }

    const data = projectRes?.data;
    const cleanedData = Utils.parseProjects(data);
    
    // Print out each item which consists of feature_gate name, enabled/disabled, default val
    cleanedData.forEach(function(item) {
        console.log(`name: ${item.name}, enabled: ${item.enabled}, defaultVal: ${item.defaultValue}`)
    });
    

    core.setOutput("project-data", cleanedData);
}

getProjectData();