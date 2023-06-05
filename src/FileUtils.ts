import * as fs from 'fs';

const ignoreList = new Set<string>(['.git', 'node_modules', 'README.md', 
    'action.yml', '.github', '.gitignore', 'package-lock.json', 'package.json', 'FileUtils.ts']);
const allowedExtensions = new Set<string>(['ts', 'py'])
const extensionToRegexMap = new Map<string, string>([
        ["ts", `checkGate\(.*, ?['"]?(?<gateName>.*)['"]\)`],
        ["py", `check_gate\(.*, ['"]?(?<gateName>.*)['"]\)`],
    ]);

export default function getFiles(): Promise<string[]> {

    let directory = ""
    directory = process.env.GITHUB_WORKSPACE;
    // directory = '/Users/jairogarciga/Github-Code-References/github-code-references' 

    const fileList = scanFiles(directory);
    return fileList;
}

// BFS search through all files
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

export function searchFile(fileDir: string) {
    // Assume in typescript or Python only for now
    
    let gatesFound = []
    const regex = '';

    // Split current directory based on .
    const splitDir = fileDir.split('.');
    const extension = splitDir.at(-1);

    if (allowedExtensions.has(extension)) {
        
        // Read within the file for the target string
        const fileData = fs.readFileSync(fileDir, 'utf-8')
        const lineDividedData = fileData.split('\n')

        // Different languages, clients, servers have differentw ways of creating gates
        // Different regex target each instead of using one big regex blob
        const regex = new RegExp(extensionToRegexMap.get(extension))

        // Loop over each line, regex search for the 
        for (let line = 0; line < lineDividedData.length; line++) {
            const currLine = lineDividedData[line];
            const found = currLine.match(regex)

            // If a gate exists in a file, add to the list of total gates found
            if (found) {
                const gateName = found.groups.gateName

                gatesFound.push({
                    'line': line.toString(), 
                    'gateName': gateName
                });
            }
        }
    }

    return gatesFound;
}