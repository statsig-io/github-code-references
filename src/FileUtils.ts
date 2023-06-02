import * as fs from 'fs';

export default async function getFiles() {

    const directory = process.env.GITHUB_WORKSPACE;
    console.log(directory)

    let fileList = [];


    function scanFiles(dir) { // BFS code to find all gate references
        let queue = [dir]; // queue of directories

        while (queue) {
            console.log('Queue:', queue);
            let currFile = queue.pop();

            if (fs.lstatSync(currFile).isDirectory()) { // Get all sub-directories
                fs.readdirSync(currFile).forEach(file => {
                    queue.push(file);
                })
            } else { // Scan each file, for now just print file name
                console.log(currFile);
            }
        }
    };

    scanFiles(directory);

}