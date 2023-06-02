"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
async function getFiles() {
    // const directory = process.env.GITHUB_WORKSPACE;
    const directory = '/Users/jairogarciga/Github-Code-References/github-code-references/';
    console.log(directory);
    let fileList = [];
    function scanFiles(dir) {
        let queue = [dir]; // queue of directories
        while (queue) {
            console.log('Queue:', queue);
            let currFileDir = queue.pop();
            if (fs.lstatSync(currFileDir).isDirectory()) { // Get all sub-directories
                fs.readdirSync(currFileDir).forEach(subFileDir => {
                    console.log(subFileDir);
                    queue.push(`${currFileDir}/${subFileDir}`);
                });
            }
            else { // Scan each file, for now just print file name
                console.log(currFileDir);
            }
        }
    }
    ;
    scanFiles(directory);
}
exports.default = getFiles;
//# sourceMappingURL=FileUtils.js.map