import { pullRequestData, invalidPullRequestData } from "./PullRequestData";
import { parsePullRequestData, searchConfigsInFile, searchGatesInFile } from "../src/utils/FileUtils"

const nodeTestFile = "regex_tests/nodejsTests.js"
const pythonTestFile = "regex_tests/pythonTests.py"
const typescriptTestFile = "regex_tests/typescriptTests.ts"

const mainDir = "tests/file_utils.test.ts"
describe('Test FileUtils.ts parsePullRequest', () => {

    // Uses the PullRequestData.ts data
    test('parsePullRequest on Valid Data', () => {
        const testData = pullRequestData;
        const result = parsePullRequestData(testData, "test_dir");
        const expectedRes: string[] = 
        ['test_dir/tests/PullRequestData.ts','test_dir/tests/helloWorld.ts', 'test_dir/tests/fineThankYou.ts'];
        expect(result).toEqual(expectedRes);
    });

    // Should return empty array
    test('parsePullRequest on empty Data', () => {
        const result = parsePullRequestData([], "test_dir");
        expect(result).toEqual([]);
    });

    test('parsePullRequest on Invalid Data', () => {
        expect(() => parsePullRequestData(invalidPullRequestData, "test_dir")).toThrow();
    })
})

// Validate that gates can be found within files using regex
describe('Test FileUtils searchGatesInFile', () => {

    test('searchGatesInFile with node.js', () => {
        const gateRes = searchGatesInFile(nodeTestFile);
        const expectedRes = [ { line: '7', gateName: 'silly_gate' }, { line: '8', gateName: 'node_js_gate' } ]
        expect(gateRes).toEqual(expectedRes);
    })

    test('searchGatesInFile with python', () => {
        const gateRes = searchGatesInFile(pythonTestFile);
        const expectedRes = [ { line: '2', gateName: 'silly_gate' } ]
        expect(gateRes).toEqual(expectedRes);
    })

    test('searchGatesInFile with typescript', () => {
        const gateRes = searchGatesInFile(typescriptTestFile);
        const expectedRes = 
        [ { line: '11', gateName: 'dummy_gate' }, { line: '12', gateName: 'silly_gate' } ]
        expect(gateRes).toEqual(expectedRes);
    })

    test('searchGatesInFile with empty file', () => {
        const emptyRes = searchGatesInFile("");
        expect(emptyRes).toEqual([]);
    })
})

// Validate dynamic configs
describe('Test FileUtils searchConfigsInFile', () => {

    test('searchConfigsInFile with node.js', () => {
        const gateRes = searchConfigsInFile(nodeTestFile);
        const expectedRes = [ { line: '9', configName: 'nodejs_dynamic_config' } ]
        expect(gateRes).toEqual(expectedRes);
    })

    test('searchConfigsInFile with python', () => {
        const gateRes = searchConfigsInFile(pythonTestFile);
        const expectedRes = [ { line: '3', configName: 'dynamic_config' } ]
        expect(gateRes).toEqual(expectedRes);
    })

    test('searchConfigsInFile with typescript', () => {
        const gateRes = searchConfigsInFile(typescriptTestFile);
        const expectedRes = 
        [ {line: "13", configName: "typescript_dynamic_config"} ]
        expect(gateRes).toEqual(expectedRes);
    })

    test('scanConfigsInFile with empty file', () => {
        const emptyRes = searchConfigsInFile("");
        expect(emptyRes).toEqual([]);
    })
})