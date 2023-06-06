"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchConfigsInFile = exports.searchGatesInFile = void 0;
const fs = require("fs");
const ignoreList = new Set(['.git', 'node_modules', 'README.md',
    'action.yml', '.github', '.gitignore', 'package-lock.json', 'package.json', 'FileUtils.ts']);
// Add to these overtime
const allowedExtensions = new Set(['ts', 'py']);
const extensionToGateRegexMap = new Map([
    ["ts", `checkGate\(.*, ?['"]?(?<gateName>.*)['"]\)`],
    ["py", `check_gate\(.*, ['"]?(?<gateName>.*)['"]\)`],
]);
const extensionToConfigRegexMap = new Map([
    ["ts", `getConfig\(.*, ?['"]?(?<configName>.*)['"]\)`],
    ["py", `get_config\(.*, ['"]?(?<configName>.*)['"]\)`],
]);
function getFiles() {
    // const directory = process.env.GITHUB_WORKSPACE;
    // console.log(process.env.GITHUB_REF);
    const directory = '/Users/jairogarciga/Github-Code-References/github-code-references';
    const fileList = scanFiles(directory);
    return fileList;
}
exports.default = getFiles;
// BFS search through all files
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
;
// Searched solely for Feature Gates
function searchGatesInFile(fileDir) {
    // Assume in typescript or Python only for now
    let gatesFound = [];
    const regex = '';
    // Split current directory based on .
    const splitDir = fileDir.split('.');
    const extension = splitDir.at(-1);
    if (allowedExtensions.has(extension)) {
        // Read within the file for the target string
        const fileData = fs.readFileSync(fileDir, 'utf-8');
        const lineDividedData = fileData.split('\n');
        // Different languages, clients, servers have differentw ways of creating gates
        // Different regex target each instead of using one big regex blob
        const regex = new RegExp(extensionToGateRegexMap.get(extension));
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
exports.searchGatesInFile = searchGatesInFile;
// Searched solely for Feature Gates
function searchConfigsInFile(fileDir) {
    // Assume in typescript or Python only for now
    let configsFound = [];
    const regex = '';
    // Split current directory based on .
    const splitDir = fileDir.split('.');
    const extension = splitDir.at(-1);
    if (allowedExtensions.has(extension)) {
        // Read within the file for the target string
        const fileData = fs.readFileSync(fileDir, 'utf-8');
        const lineDividedData = fileData.split('\n');
        // Different languages, clients, servers have differentw ways of creating gates
        // Different regex target each instead of using one big regex blob
        const regex = new RegExp(extensionToConfigRegexMap.get(extension));
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
exports.searchConfigsInFile = searchConfigsInFile;
//# sourceMappingURL=FileUtils.js.map