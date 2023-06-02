"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
async function getFiles() {
    const directory = process.env.GITHUB_WORKSPACE;
    console.log(directory);
    let fileList = [];
    fs.readdirSync(directory).forEach(file => {
        console.log(file);
        fileList.push(file);
    });
}
exports.default = getFiles;
//# sourceMappingURL=getFiles.js.map