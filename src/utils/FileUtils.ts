import * as fs from 'fs';
import GateData from '../data_classes/GateData';
import DynamicConfigData from '../data_classes/DynamicConfigData';

// Not worth checking files or folders that won't have feature gates
const ignoreList = new Set<string>(['.git', 'node_modules', 'README.md', 
    'action.yml', '.github', '.gitignore', 'package-lock.json', 'package.json', 'FileUtils.ts']);

const extensionIgnoreList = new Set<string>(['git', 'yaml', 'yml', 'json', 'github', 'gitignore', 'md', 'map'])

// Add to these overtime
const SUPPORTED_EXTENSIONS = new Set<string>(['ts', 'py', 'js'])

// Regex match all found
const REGEX_FLAG = 'i';

// Used to find all gates and for replacing unexpected gate usages
export const extensionToGateFullRegexMap = new Map<string, RegExp>([
    ["ts", /(?<lineStart>[\n\w_ ]*=)?[a-zA-Z_ .]*checkGate\([\w ,]*['"]?(?<gateName>[\w _-]*)['"]?\) *;?/i],
    ["js", /(?<lineStart>[\n\w_ ]*=)?[a-zA-Z_ .]*checkGate\([\w ,]*['"]?(?<gateName>[\w _-]*)['"]?\) *;?/i],
    ["py", /(?<lineStart>[\n\w _]*=)?[a-zA-Z _.]*check_gate\(.*, *['"]?(?<gateName>[\w _-]*)['"]?\) */i],
]);

// Used to replace gates as expected to be used
export const extensionToGatePartialRegexMap = new Map<string, RegExp>([
    ["ts", /[a-zA-Z_ .]*checkGate\([\w ,]*['"]?(?<gateName>[\w _-]*)['"]?\) *;?/i],
    ["js", /[a-zA-Z_ .]*checkGate\([\w ,]*['"]?(?<gateName>[\w _-]*)['"]?\) *;?/i],
    ["py", /[a-zA-Z _.]*check_gate\(.*, *['"]?(?<gateName>[\w _-]*)['"]?\) */i],
]);

export const extensionToConfigRegexMap = new Map<string, RegExp>([
    ["ts", /[a-zA-Z_ .]*getConfig\([\w ,]*['"]?(?<configName>[\w _-]*)['"]?\)/i],
    ["js", /[a-zA-Z_ .]*getConfig\([\w ,]*['"]?(?<configName>[\w _-]*)['"]?\)/i],
    ["py", /[a-zA-Z _.]*get_config\(.*, *['"]?(?<configName>[\w _-]*)['"]?\)/i],
]);

// The values that replace stale gates or configs
const extensionToGateReplace = new Map<string, string>([
    ["ts", " false;"], // Space before each for formatting when it gets replaced in
    ["js", " false;"],
    ["py", " False"],
])

const extensionToConfigReplace = new Map<string, string>([
    ["ts", " {}"], // Space before each for formatting when it gets replaced in
    ["js", " {}"],
    ["py", " {}"],
])

export function getGeneralGateRegex(extension: string) {
    const baseRegex = extensionToGateFullRegexMap.get(extension).source;
    return new RegExp(baseRegex, REGEX_FLAG);
}

// Creates a new regex object that searches specifically for the targetGate
export function getSpecificFullGateRegex(targetGate: string, extension: string) {
    const gateCatchingGroup = '(?<gateName>[\\w _-]*)';
    const regexSource = extensionToGateFullRegexMap.get(extension).source;
    const specificRegex = regexSource.replace(gateCatchingGroup, targetGate);
    return new RegExp(specificRegex, REGEX_FLAG);
}

export function getSpecificPartialGateRegex(targetGate: string, extension: string) {
    const gateCatchingGroup = '(?<gateName>[\\w _-]*)';
    const regexSource = extensionToGatePartialRegexMap.get(extension).source;
    const specificRegex = regexSource.replace(gateCatchingGroup, targetGate);
    return new RegExp(specificRegex, REGEX_FLAG);
}

// BFS search through local files
export async function scanFiles(dir: string): Promise<string[]> {
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

export function getFeatureGatesInFiles(fileNames: string[]) {
    let allGates: GateData[] = [];
    for (const file of fileNames) {
        const gatesFound = searchGates(file);
        const fileName = file.split('/').at(-1);
        const gateData = new GateData(file, fileName, gatesFound);

        if (gatesFound.length >= 1) {
            allGates.push(gateData);
        }
    }
    return allGates;
}

export function getDynamicConfigsInFiles(fileNames: string[]) {
    let foundConfigs = []
    for (const file of fileNames) {
        const configsFound = searchConfigs(file);
        const fileName = file.split('/').at(-1);
        const configData = new DynamicConfigData(file, fileName, configsFound);

        if (configsFound.length >= 1) {
          foundConfigs.push(configData);
        }
    }
    return foundConfigs;
  }

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

// Searched solely for Feature Gates, 
export function searchGates(fileDir: string) {
    let gatesFound = [];

    // Split current directory based on .
    const splitDir = fileDir.split('.');
    const extension = splitDir.at(-1);

    if (SUPPORTED_EXTENSIONS.has(extension)) {
        console.log(`On file ${fileDir} with supported extension ${extension}`);
        // Read within the file for the target string
        const fileData = fs.readFileSync(fileDir, 'utf-8')
        const lineDividedData = fileData.split('\n')

        // Different languages, clients, servers have differentw ways of creating gates
        // Different regex target each instead of using one big regex blob
        const regex = getGeneralGateRegex(extension);
        console.log(`regex used:`, regex)

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

// Decided to seperate this from the regular search to avoid coupling and because
// at it's core it doesn't want to do anything with the files besides substitute them.
export function replaceStaleGates(staleGates: string[], fileDir: string) {
    // Split current directory based on .
    const splitDir = fileDir.split('.');
    const extension = splitDir.at(-1);

    if (SUPPORTED_EXTENSIONS.has(extension)) {
        
        // Read within the file for the target string
        const fileData = fs.readFileSync(fileDir, 'utf-8')
        let replacedFile = fileData;

        for (const staleGate of staleGates) {
            // Different languages, clients, servers have differentw ways of creating gates
            // Different regex target each instead of using one big regex blob
            const newString = extensionToGateReplace.get(extension);
            const fullRegex = getSpecificFullGateRegex(staleGate, extension);
            const partialRegex = getSpecificPartialGateRegex(staleGate, extension);
            
            const gateMatch = replacedFile.match(fullRegex);

            if (gateMatch) { // If the stale gate has already been modified on the cleaned branch, then it should not match
                const matchedGroups = gateMatch.groups;

                if (!matchedGroups.lineStart) {// if there is no start of the line, remove the entire line
                    replacedFile = replacedFile.replace(fullRegex, ""); // Remove the entire line
                } else {
                    replacedFile = replacedFile.replace(partialRegex, newString); // If the gate is used as expected, clean it normally
                }
            }
        }

        // Write into the old file with the gates cleaned out
        fs.writeFileSync(fileDir, replacedFile, 'utf-8');
    }
}

// Searched solely for Feature Gates
export function searchConfigs(fileDir: string) {
    // Assume in typescript or Python only for now
    
    let configsFound = [];

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

export function replaceStaleConfigs(fileDir: string) {
    // Split current directory based on .
    const splitDir = fileDir.split('.');
    const extension = splitDir.at(-1);

    if (SUPPORTED_EXTENSIONS.has(extension)) {
        
        // Read within the file for the target string
        const fileData = fs.readFileSync(fileDir, 'utf-8')

        // Different languages, clients, servers have differentw ways of creating gates
        // Different regex target each instead of using one big regex blob
        const newString = extensionToConfigReplace.get(extension);
        const regex = new RegExp(extensionToConfigRegexMap.get(extension), REGEX_FLAG);

        const replacedFile = fileData.replace(regex, newString);

        // Write into the old file with the gates cleaned out
        fs.writeFileSync(fileDir, replacedFile, 'utf-8');
    }
}