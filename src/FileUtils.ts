import * as fs from 'fs';
import * as os from 'os';

export default async function getFiles() {

    const directory = process.env.GITHUB_WORKSPACE;
    console.log(directory)

    let fileList = [];
    fs.readdirSync(directory).forEach(file => {
        console.log(file);
        fileList.push(file)
    })

}