import * as fs from 'fs';
import Utils, { ForegroundColor, ColorReset } from './Utils';
import axiosRetry from 'axios-retry';
import axios, { AxiosError, AxiosResponse } from 'axios';

// Not worth checking files or folders that won't have feature gates
const ignoreList = new Set<string>(['.git', 'node_modules', 'README.md', 
    'action.yml', '.github', '.gitignore', 'package-lock.json', 'package.json', 'FileUtils.ts']);
const extensionIgnoreList = new Set<string>(['git', 'yaml', 'yml', 'json', 'github', 'gitignore', 'md', 'map'])

// Add to these overtime
const SUPPORTED_EXTENSIONS = new Set<string>(['ts', 'py', 'js'])
const extensionToGateRegexMap = new Map<string, RegExp>([
    ["ts", /checkGate\([\w ,]*['"]?(?<gateName>[\w _-]*)['"]?\)/i],
    ["js", /checkGate\([\w ,]*['"]?(?<gateName>[\w _-]*)['"]?\)/i],
    ["py", /check_gate\(.*, *['"]?(?<gateName>[\w _-]*)['"]?\)/i],
]);
const extensionToConfigRegexMap = new Map<string, RegExp>([
    ["ts", /getConfig\(.*, ?['"]?(?<configName>.*)['"]\)/i],
    ["js", /getConfig\(.*, ?['"]?(?<configName>.*)['"]\)/i],
    ["py", /get_config\(.*, ['"]?(?<configName>.*)['"]\)/i],
]);

// Leverage Github API and environment variables to access files touched by Pull Requests
export default async function getFiles(githubKey: string): Promise<string[]> {

    let fileList = [];

    // const directory = '/Users/jairogarciga/Github-Code-References/github-code-references'
    const directory = Utils.getGithubDirectory();

    // Only run on Pull Requests
    if (!Utils.isGithubEventSchedule()) {

        const pullRequestNum = Utils.getPullRequestNum();
        const githubOwner = Utils.getRepoOwner();
        const repoName = Utils.getRepoName();

        console.log(`Checking out ${githubOwner}:${repoName} on Pull Request ${pullRequestNum}`);

        const retries = 7;
        axiosRetry(axios, {
        retries: retries,
        });
        const timeout = 2000000;

        // Do a GITHUB API Get request for the specific pull that triggered the workflow
        // Use that to get the touched files
        let result: AxiosResponse | undefined;
        try {
        result = await axios.get(
            `https://api.github.com/repos/${githubOwner}/${repoName}/pulls/${pullRequestNum}/files`,
            {
                headers: {
                    'Authorization': `Bearer ${githubKey}`,
                    'Accept': 'application/vnd.github+json',
                    'Content-Type': 'application/json',
                },
                timeout: timeout, // Sometimes the delay is greater than the speed GH workflows can get the data
                data: {
                    'per_page': 100,
                    'page': 1,
                }
            }
        )
        } catch (e: unknown) {
            result = (e as AxiosError)?.response;
            throw Error(`Error Requesting after ${retries} attempts`);
        }
        
        console.log('Picking up Files ☺');
        fileList = parsePullRequestData(result?.data, directory);
        console.log('Finished picking up Files ☺\n');

    } else {
        fileList = await scanFiles(directory); // No need to do a Get request, just check locally
    }

    for (const fileDir of fileList) {
        // Output a valid file found, wrap it with ANSI Green
        console.log(`\t${ForegroundColor.Green}${fileDir}${ColorReset}`)
    }

    return fileList;
}

// BFS search through local files
async function scanFiles(dir: string): Promise<string[]> {
    let fileList: string[] = [];
    let queue: string[] = [dir]; // queue of directories

    while (queue.length > 0) {
        let currFileDir = queue.pop();

        if (fs.lstatSync(currFileDir).isDirectory()) { // Get all sub-directories
            fs.readdirSync(currFileDir).forEach(subFile => {

                // Certain directories should be ignored, like node_modules
                if (!ignoreList.has(subFile)) {
                    queue.push(`${currFileDir}/${subFile}`);
                }
            })
        } else {
            fileList.push(currFileDir);
        }
    }

    return fileList;
};

// Get the file locations based on the pull request data from the Github API
export function parsePullRequestData(data, mainDirectory: string): string[] {
    let fileLocations: string[] = [];

    for (const pullRequestFile of data) {
        const fileName = pullRequestFile['filename'];
        const fileExtension = fileName.split('.').at(-1);
        const fileStatus = pullRequestFile['status'];
        
        // Check if file has a valid extension for checking or if it has been deleted
        if (!extensionIgnoreList.has(fileExtension) && fileStatus != 'removed') {
            const completeFileDir = `${mainDirectory}/${fileName}`;
            fileLocations.push(completeFileDir);
        }
    }
    
    return fileLocations;
}

// Searched solely for Feature Gates
export function searchGatesInFile(fileDir: string) {
    // Assume in typescript or Python only for now
    
    let gatesFound = [];
    const regex = '';

    // Split current directory based on .
    const splitDir = fileDir.split('.');
    const extension = splitDir.at(-1);

    if (SUPPORTED_EXTENSIONS.has(extension)) {
        
        // Read within the file for the target string
        const fileData = fs.readFileSync(fileDir, 'utf-8')
        const lineDividedData = fileData.split('\n')

        // Different languages, clients, servers have differentw ways of creating gates
        // Different regex target each instead of using one big regex blob
        const regex = extensionToGateRegexMap.get(extension);

        // Loop over each line, regex search for the 
        for (let line = 0; line < lineDividedData.length; line++) {
            const currLine = lineDividedData[line];
            const found = currLine.match(regex)

            // If a gate exists in a file, add to the list of total gates found
            if (found) {
                const gateName = found.groups.gateName

                gatesFound.push({
                    'line': line.toString(), 
                    'gateName': gateName,
                });
            }
        }
    }

    return gatesFound;
}

// Searched solely for Feature Gates
export function searchConfigsInFile(fileDir: string) {
    // Assume in typescript or Python only for now
    
    let configsFound = [];
    const regex = '';

    // Split current directory based on .
    const splitDir = fileDir.split('.');
    const extension = splitDir.at(-1);

    if (SUPPORTED_EXTENSIONS.has(extension)) {
        
        // Read within the file for the target string
        const fileData = fs.readFileSync(fileDir, 'utf-8')
        const lineDividedData = fileData.split('\n')

        // Different languages, clients, servers have differentw ways of creating gates
        // Different regex target each instead of using one big regex blob
        const regex = new RegExp(extensionToConfigRegexMap.get(extension))

        // Loop over each line, regex search for the 
        for (let line = 0; line < lineDividedData.length; line++) {
            const currLine = lineDividedData[line];
            const found = currLine.match(regex)

            // If a gate exists in a file, add to the list of total gates found
            if (found) {
                const configName = found.groups.configName;
                configsFound.push({
                    'line': line.toString(), 
                    'configName': configName,
                });
            }
        }
    }

    return configsFound;
}