import axios, { AxiosError, AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';
import Utils from './Utils'

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
                    "statsig-api-key": key,
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
    console.log(data)
    return data;
}

getProjectData();