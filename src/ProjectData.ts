import axios, { AxiosError, AxiosResponse } from 'axios';
import GateData from './GateData'
import getFiles from './FileUtils'
import { searchFile } from './FileUtils';
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

    // Scan files for all gates that could be in them
    // Get the file, the line, and the gate name for each gate
    let fileNames = await getFiles();
    let allGates: GateData[] = []
    fileNames.forEach((file) => {
        const gatesFound = searchFile(file);
        const fileName = file.split('/').at(-1);
        const gateData = new GateData(file, fileName, gatesFound);

        if (gatesFound.length >= 1) {
            allGates.push(gateData);
        }
    })

    // Post request to the project with the input API key
    // Collect gates into map where the key is the gate name
    try {
        projectRes = await axios.post(
            'https://statsigapi.net/developer/v1/projects',
            null,
            {
                headers: {
                    "statsig-api-key": `6wdiBivL3kECj1ducAZrc4:Ie1nOKs9KVAkCOwPnPiiUjCdipPPXAW0yVZNvHFQq6h`, // sdkKey,
                    'Content-Type': 'application/json',
                },
                timeout: 100000,
            }
        )
    } catch (e: unknown) {
        projectRes = (e as AxiosError)?.response;
        console.log("Error Requesting after 8 attempts");
    }

    const data = projectRes?.data;
    const cleanedData = Utils.parseProjects(data); // Map of all the gates from the project

    // Get data only on the feature gates found within the local files
    allGates.forEach(function(file) {
        let updatedGates = [];
        file.gates.forEach(function(gate) { // gate{ line: ..., gateName: ...}
            // Get the respective gate from project data
            let projectGate = cleanedData.get(gate.gateName)

            gate = {
                'line': gate.line,
                'gateName': gate.gateName,
                'enabled': projectGate['enabled'],
                'defaultValue': projectGate['defaultValue'],
            }

            updatedGates.push(gate) // Add to the new list of gates for this specific file
        })

        file.gates = updatedGates;
    });

    Utils.outputFinalGateData(allGates);

    core.setOutput("project-data", ':)');
}

getProjectData();