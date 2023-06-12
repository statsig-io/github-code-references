"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replaceStaleConfigs = exports.searchConfigs = exports.replaceStaleGates = exports.searchGates = exports.parsePullRequestData = exports.getDynamicConfigsInFiles = exports.getFeatureGatesInFiles = exports.scanFiles = exports.getSpecificGateRegex = exports.getGeneralGateRegex = exports.extensionToConfigRegexMap = exports.extensionToGateRegexMap = void 0;
const fs = require("fs");
const GateData_1 = require("../data_classes/GateData");
const DynamicConfigData_1 = require("../data_classes/DynamicConfigData");
// Not worth checking files or folders that won't have feature gates
const ignoreList = new Set(['.git', 'node_modules', 'README.md',
    'action.yml', '.github', '.gitignore', 'package-lock.json', 'package.json', 'FileUtils.ts']);
const extensionIgnoreList = new Set(['git', 'yaml', 'yml', 'json', 'github', 'gitignore', 'md', 'map']);
// Add to these overtime
const SUPPORTED_EXTENSIONS = new Set(['ts', 'py', 'js']);
// Regex match all found
const GLOBAL_FLAG = 'gi';
exports.extensionToGateRegexMap = new Map([
    ["ts", /[a-zA-Z_ .]*checkGate\([\w ,]*['"]?(?<gateName>[\w _-]*)['"]?\)/i],
    ["js", /[a-zA-Z_ .]*checkGate\([\w ,]*['"]?(?<gateName>[\w _-]*)['"]?\)/i],
    ["py", /[a-zA-Z _.]*check_gate\(.*, *['"]?(?<gateName>[\w _-]*)['"]?\)/i],
]);
exports.extensionToConfigRegexMap = new Map([
    ["ts", /[a-zA-Z_ .]*getConfig\([\w ,]*['"]?(?<configname>[\w _-]*)['"]?\)/i],
    ["js", /[a-zA-Z_ .]*getConfig\([\w ,]*['"]?(?<configname>[\w _-]*)['"]?\)/i],
    ["py", /[a-zA-Z _.]*get_config\(.*, *['"]?(?<configName>[\w _-]*)['"]?\)/i],
]);
// The values that replace stale gates or configs
const extensionToGateReplace = new Map([
    ["ts", " false"],
    ["js", " false"],
    ["py", " False"],
]);
const extensionToConfigReplace = new Map([
    ["ts", " {}"],
    ["js", " {}"],
    ["py", " {}"],
]);
function getGeneralGateRegex(extension) {
    const baseRegex = exports.extensionToGateRegexMap.get(extension);
    return new RegExp(baseRegex, GLOBAL_FLAG);
}
exports.getGeneralGateRegex = getGeneralGateRegex;
// Creates a new regex object that searches specifically for the targetGate
function getSpecificGateRegex(targetGate, extension) {
    const gateCatchingGroup = '(?<gateName>[\\w _-]*)';
    const regexSource = exports.extensionToGateRegexMap.get(extension).source;
    const specificRegex = regexSource.replace(gateCatchingGroup, targetGate);
    return new RegExp(specificRegex, GLOBAL_FLAG);
}
exports.getSpecificGateRegex = getSpecificGateRegex;
// BFS search through local files
async function scanFiles(dir) {
    let fileList = [];
    let queue = [dir]; // queue of directories
    while (queue.length > 0) {
        let currFileDir = queue.pop();
        if (fs.lstatSync(currFileDir).isDirectory()) { // Get all sub-directories
            fs.readdirSync(currFileDir).forEach(subFile => {
                // Certain directories should be ignored, like node_modules
                if (!ignoreList.has(subFile)) {
                    queue.push(`${currFileDir}/${subFile}`);
                }
            });
        }
        else {
            fileList.push(currFileDir);
        }
    }
    return fileList;
}
exports.scanFiles = scanFiles;
;
function getFeatureGatesInFiles(fileNames) {
    let allGates = [];
    for (const file of fileNames) {
        const gatesFound = searchGates(file);
        const fileName = file.split('/').at(-1);
        const gateData = new GateData_1.default(file, fileName, gatesFound);
        if (gatesFound.length >= 1) {
            allGates.push(gateData);
        }
    }
    return allGates;
}
exports.getFeatureGatesInFiles = getFeatureGatesInFiles;
function getDynamicConfigsInFiles(fileNames) {
    let foundConfigs = [];
    for (const file of fileNames) {
        const configsFound = searchConfigs(file);
        const fileName = file.split('/').at(-1);
        const configData = new DynamicConfigData_1.default(file, fileName, configsFound);
        if (configsFound.length >= 1) {
            foundConfigs.push(configData);
        }
    }
    return foundConfigs;
}
exports.getDynamicConfigsInFiles = getDynamicConfigsInFiles;
// Get the file locations based on the pull request data from the Github API
function parsePullRequestData(data, mainDirectory) {
    let fileLocations = [];
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
exports.parsePullRequestData = parsePullRequestData;
// Searched solely for Feature Gates, 
function searchGates(fileDir) {
    let gatesFound = [];
    // Split current directory based on .
    const splitDir = fileDir.split('.');
    const extension = splitDir.at(-1);
    if (SUPPORTED_EXTENSIONS.has(extension)) {
        // Read within the file for the target string
        const fileData = fs.readFileSync(fileDir, 'utf-8');
        const lineDividedData = fileData.split('\n');
        // Different languages, clients, servers have differentw ways of creating gates
        // Different regex target each instead of using one big regex blob
        const regex = getGeneralGateRegex(extension);
        // Loop over each line, regex search for the 
        for (let line = 0; line < lineDividedData.length; line++) {
            const currLine = lineDividedData[line];
            const found = currLine.match(regex);
            // If a gate exists in a file, add to the list of total gates found
            if (found) {
                const gateName = found.groups.gateName;
                gatesFound.push({
                    'line': line.toString(),
                    'gateName': gateName,
                });
            }
        }
    }
    return gatesFound;
}
exports.searchGates = searchGates;
// Decided to seperate this from the regular search to avoid coupling and because
// at it's core it doesn't want to do anything with the files besides substitute them.
function replaceStaleGates(staleGates, fileDir) {
    // Split current directory based on .
    const splitDir = fileDir.split('.');
    const extension = splitDir.at(-1);
    if (SUPPORTED_EXTENSIONS.has(extension)) {
        // Read within the file for the target string
        const fileData = fs.readFileSync(fileDir, 'utf-8');
        let replacedFile = fileData;
        for (const staleGate of staleGates) {
            // Different languages, clients, servers have differentw ways of creating gates
            // Different regex target each instead of using one big regex blob
            const newString = extensionToGateReplace.get(extension);
            const regex = getSpecificGateRegex(staleGate, extension);
            replacedFile = fileData.replace(regex, newString);
        }
        // Write into the old file with the gates cleaned out
        fs.writeFileSync(fileDir, replacedFile, 'utf-8');
    }
}
exports.replaceStaleGates = replaceStaleGates;
// Searched solely for Feature Gates
function searchConfigs(fileDir) {
    // Assume in typescript or Python only for now
    let configsFound = [];
    // Split current directory based on .
    const splitDir = fileDir.split('.');
    const extension = splitDir.at(-1);
    if (SUPPORTED_EXTENSIONS.has(extension)) {
        // Read within the file for the target string
        const fileData = fs.readFileSync(fileDir, 'utf-8');
        const lineDividedData = fileData.split('\n');
        // Different languages, clients, servers have differentw ways of creating gates
        // Different regex target each instead of using one big regex blob
        const regex = new RegExp(exports.extensionToConfigRegexMap.get(extension));
        // Loop over each line, regex search for the 
        for (let line = 0; line < lineDividedData.length; line++) {
            const currLine = lineDividedData[line];
            const found = currLine.match(regex);
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
exports.searchConfigs = searchConfigs;
function replaceStaleConfigs(fileDir) {
    // Split current directory based on .
    const splitDir = fileDir.split('.');
    const extension = splitDir.at(-1);
    if (SUPPORTED_EXTENSIONS.has(extension)) {
        // Read within the file for the target string
        const fileData = fs.readFileSync(fileDir, 'utf-8');
        // Different languages, clients, servers have differentw ways of creating gates
        // Different regex target each instead of using one big regex blob
        const newString = extensionToConfigReplace.get(extension);
        const regex = new RegExp(exports.extensionToConfigRegexMap.get(extension), GLOBAL_FLAG);
        const replacedFile = fileData.replace(regex, newString);
        // Write into the old file with the gates cleaned out
        fs.writeFileSync(fileDir, replacedFile, 'utf-8');
    }
}
exports.replaceStaleConfigs = replaceStaleConfigs;
//# sourceMappingURL=FileUtils.js.map