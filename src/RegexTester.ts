import * as fs from 'fs';


const extensionToGateRegexMap = new Map<string, RegExp>([
    ["ts", /checkGate\([\w ,]*['"]?(?<gateName>[\w _-]*)['"]?\)/i],
    ["py", /check_gate\(.*, *['"]?(?<gateName>[\w _-]*)['"]?\)/i],
]);
const extensionToConfigRegexMap = new Map<string, RegExp>([
    ["ts", /getConfig\(.*, ?['"]?(?<configName>.*)['"]\)/i],
    ["py", /get_config\(.*, ['"]?(?<configName>.*)['"]\)/i],
]);


`
---------- Node.js ----------

Feature Gate
const test = await statsig.checkGate(dummyUser, 'silly_gate');

Dynamic Config 
const config = await Statsig.getConfig(user, "awesome_product_details");

---------- TS/JS ----------

Feature Gate
Statsig.checkGate('ts_js');

Dynamic Config
const config: DynamicConfig = Statsig.getConfig("ts/js");

---------- Python ----------

Feature Gate
statsig.check_gate(StatsigUser("user-id"), "python")
statsig.check_gate(StatsigUser("user-id"),'python')

Dynamic Config
config = statsig.get_config(StatsigUser("user-id"), "python")

`

let gatesFound = [];
const regex = /checkGate\([\w ,]*['"]?(?<gateName>[\w _-]*)['"]?\)/i;
const fileDir = 'dist/RegexTester.js'

// Read within the file for the target string
const fileData = fs.readFileSync(fileDir, 'utf-8')
const lineDividedData = fileData.split('\n')

// Different languages, clients, servers have differentw ways of creating gates
// Different regex target each instead of using one big regex blob

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

console.log(gatesFound);