"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchFile = void 0;
const fs = require("fs");
const ignoreList = new Set(['.git', 'node_modules', 'README.md',
    'action.yml', '.github', '.gitignore', 'package-lock.json', 'package.json', 'FileUtils.ts']);
const allowedExtensiosn = new Set(['ts']);
const extensionToRegexMap = new Map([
    ["ts", `checkGate\(.*, ['"]?(?<gateName>.*)['"]\)`]
]);
function getFiles() {
    // const directory = process.env.GITHUB_WORKSPACE;
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
function searchFile(fileDir) {
    // Assume in typescript only for now
    let gatesFound = [];
    const regex = '';
    // Split current directory based on .
    const splitDir = fileDir.split('.');
    const extension = splitDir.at(-1);
    if (allowedExtensiosn.has(extension)) {
        // Read within the file for the target string
        const fileData = fs.readFileSync(fileDir, 'utf-8');
        const lineDividedData = fileData.split('\n');
        // Different languages, clients, servers have differentw ways of creating gates
        // Different regex target each instead of using one big regex blob
        const regex = new RegExp(extensionToRegexMap.get(extension));
        // Loop over each line, regex search for the 
        for (let line = 0; line < lineDividedData.length; line++) {
            const currLine = lineDividedData[line];
            const found = currLine.match(regex);
            if (found) {
                const gateName = found.groups.gateName;
                gatesFound.push({
                    'line': line.toString(),
                    'gateName': gateName
                });
            }
        }
    }
    return gatesFound;
}
exports.searchFile = searchFile;
//# sourceMappingURL=FileUtils.js.map