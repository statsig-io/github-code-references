import * as fs from 'fs';

export default async function getFiles() {

    // const directory = process.env.GITHUB_WORKSPACE;
    const directory = '/Users/jairogarciga/Github-Code-References/github-code-references/'
    console.log(directory)

    let fileList = [];


    function scanFiles(dir) { // BFS code to find all gate references
        let queue = [dir]; // queue of directories

        while (queue) {
            console.log('Queue:', queue);
            let currFileDir = queue.pop();

            if (fs.lstatSync(currFileDir).isDirectory()) { // Get all sub-directories
                fs.readdirSync(currFileDir).forEach(subFileDir => {
                    console.log(subFileDir);
                    queue.push(`${currFileDir}/${subFileDir}`);
                })
            } else { // Scan each file, for now just print file name
                console.log(currFileDir);
            }
        }
    };

    scanFiles(directory);

}