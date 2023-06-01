import axios, { AxiosError, AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';
import Utils from './Utils'
import * as core from "@actions/core";

axiosRetry(axios, {
    retries: 7,
});

// Calls the endpoint using the API key and gets the projects info
export default async function getProjectData() {

    let projectRes: AxiosResponse | undefined;

    const sdkKey = Utils.getKey();

    try {
        projectRes = await axios.post(
            'https://statsigapi.net/developer/v1/projects',
            null,
            {
                headers: {
                    "statsig-api-key": sdkKey,
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
    
    if (cleanedData) {
        // Print out each item which consists of feature_gate name, enabled/disabled, default val
        cleanedData.forEach(function(item) {
            console.log(`name: ${item.name}, enabled: ${item.enabled}, defaultVal: ${item.defaultValue}`)
        });
    } else {
        console.log(`Could not access the data`)
    }
    

    core.setOutput("project-data", cleanedData);
}

getProjectData();