import axios, { AxiosError, AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';

axiosRetry(axios, {
    retries: 3,
});

// Calls the endpoint using the API key and gets the projects info
export default async function getProjectData() {

    let projectRes: AxiosResponse | undefined;

    try {
        projectRes = await axios.post(
            'https://statsigapi.net/developer/v1/projects',
            null,
            {
                headers: {
                    "statsig-api-key": "6wdiBivL3kECj1ducAZrc4:Ie1nOKs9KVAkCOwPnPiiUjCdipPPXAW0yVZNvHFQq6h",
                    //"statsig-api-key": process.env.STATSIG_API_KEY,
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
    return data;
}

getProjectData();