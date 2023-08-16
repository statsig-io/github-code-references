import { pullRequestData, invalidPullRequestData } from "./PullRequestData";
import {
  SupportedFileExtensionsMap,
  getGeneralGateRegex,
  getSpecificFullGateRegex,
  parsePullRequestData,
  replaceStaleConfigs,
  replaceStaleGates,
  searchConfigs,
  searchGates,
} from "../src/utils/FileUtils";
import * as fs from "fs";

const nodeTestFile = "regex_tests/nodejsTests.js";
const pythonTestFile = "regex_tests/pythonTests.py";
const typescriptTestFile = "regex_tests/typescriptTests.ts";

const mainDir = "tests/file_utils.test.ts";
describe("Test FileUtils parsePullRequest", () => {
  let readFileSyncSpy: jest.SpyInstance;
  let writeFileSyncSpy: jest.SpyInstance;

  beforeEach(() => {
    readFileSyncSpy = jest.spyOn(fs, "readFileSync");
    writeFileSyncSpy = jest.spyOn(fs, "writeFileSync");
  });

  describe("getGeneralGateRegex", () => {
    const testCases = [
      {
        extension: "ts",
        stringToMatch: "const gate = useGate(user, 'gateName');",
        shouldMatch: true,
      },
      {
        extension: "js",
        stringToMatch: "let gate = checkGate(user, 'gateName').value;",
        shouldMatch: true,
      },
      {
        extension: "py",
        stringToMatch: "gate_value = check_gate(user, 'gateName')",
        shouldMatch: true,
      },
      {
        extension: "tsx",
        stringToMatch: "const gate = checkGate(user, 'gateName');",
        shouldMatch: true,
      },
    ];

    testCases.forEach(({ extension, stringToMatch, shouldMatch }) => {
      test(`should ${
        shouldMatch ? "match" : "not match"
      } for extension ${extension}`, () => {
        const trueExtension = SupportedFileExtensionsMap.get(extension);
        if (trueExtension === undefined) {
          throw Error("Undefined found");
        }
        const regex = getGeneralGateRegex(trueExtension);
        const result = regex.test(stringToMatch);
        expect(result).toBe(shouldMatch);
      });
    });
  });

  describe("parsePullRequestData", () => {
    test("parsePullRequest on Valid Data", () => {
      const testData = pullRequestData;
      const result = parsePullRequestData(testData, "test_dir");
      const expectedRes: string[] = [
        "test_dir/tests/PullRequestData.ts",
        "test_dir/tests/helloWorld.ts",
        "test_dir/tests/fineThankYou.ts",
      ];
      expect(result).toEqual(expectedRes);
    });

    // Should return empty array
    test("parsePullRequest on empty Data", () => {
      const result = parsePullRequestData([], "test_dir");
      expect(result).toEqual([]);
    });

    test("parsePullRequest on Invalid Data", () => {
      expect(() =>
        parsePullRequestData(invalidPullRequestData, "test_dir")
      ).toThrow();
    });
  });

  // Validate that gates can be found within files using regex
  describe("searchGates", () => {
    test("searchGatesInFile with node.js", () => {
      const gateRes = searchGates(nodeTestFile);
      const expectedRes = [
        { line: "7", gateName: "silly_gate" },
        { line: "8", gateName: "node_js_gate" },
      ];
      expect(gateRes).toEqual(expectedRes);
    });

    test("searchGatesInFile with python", () => {
      const gateRes = searchGates(pythonTestFile);
      const expectedRes = [{ line: "2", gateName: "silly_gate" }];
      expect(gateRes).toEqual(expectedRes);
    });

    test("searchGatesInFile with typescript", () => {
      const gateRes = searchGates(typescriptTestFile);
      const expectedRes = [
        { line: "11", gateName: "dummy_gate" },
        { line: "12", gateName: "silly_gate" },
      ];
      expect(gateRes).toEqual(expectedRes);
    });

    test("searchGatesInFile with empty file", () => {
      const emptyRes = searchGates("");
      expect(emptyRes).toEqual([]);
    });
  });

  // Validate dynamic configs
  describe("searchConfigs", () => {
    test("searchConfigsInFile with node.js", () => {
      const gateRes = searchConfigs(nodeTestFile);
      const expectedRes = [{ line: "9", configName: "nodejs_dynamic_config" }];
      expect(gateRes).toEqual(expectedRes);
    });

    test("searchConfigsInFile with python", () => {
      const gateRes = searchConfigs(pythonTestFile);
      const expectedRes = [{ line: "3", configName: "dynamic_config" }];
      expect(gateRes).toEqual(expectedRes);
    });

    test("searchConfigsInFile with typescript", () => {
      const gateRes = searchConfigs(typescriptTestFile);
      const expectedRes = [
        { line: "13", configName: "typescript_dynamic_config" },
      ];
      expect(gateRes).toEqual(expectedRes);
    });

    test("scanConfigsInFile with empty file", () => {
      const emptyRes = searchConfigs("");
      expect(emptyRes).toEqual([]);
    });
  });

  describe("replaceStaleGates", () => {
    beforeEach(() => {
      readFileSyncSpy = jest.spyOn(fs, "readFileSync");
      writeFileSyncSpy = jest.spyOn(fs, "writeFileSync");

      readFileSyncSpy.mockReturnValue(
        "const thisStaleGate = Statsig.checkGate(user, 'HELLO')"
      );
      writeFileSyncSpy.mockImplementation();
    });

    test("bad extension or no stale gates", () => {
      replaceStaleGates(["some-gate"], "file.unsupported-extension");
      expect(readFileSyncSpy).not.toHaveBeenCalled();
      expect(writeFileSyncSpy).not.toHaveBeenCalled();

      replaceStaleGates([], "file.py");
      expect(readFileSyncSpy).not.toHaveBeenCalled();
      expect(writeFileSyncSpy).not.toHaveBeenCalled();
    });

    test("no stale gates replaced", () => {
      replaceStaleGates(["not-the-gate"], "file.ts");
      const expectedReplacedContent =
        "const thisStaleGate = Statsig.checkGate(user, 'HELLO')";

      expect(writeFileSyncSpy).toHaveBeenCalledWith(
        "file.ts",
        expectedReplacedContent,
        "utf-8"
      );
    });

    test("no stale gates replaced", () => {
      replaceStaleGates(["HELLO"], "file.ts");
      const expectedReplacedContent = "const thisStaleGate = false;";

      expect(writeFileSyncSpy).toHaveBeenCalledWith(
        "file.ts",
        expectedReplacedContent,
        "utf-8"
      );
    });
  });

  afterEach(() => {
    readFileSyncSpy.mockClear();
    writeFileSyncSpy.mockClear();
  });

  describe("replaceStaleConfigs", () => {
    beforeEach(() => {
      readFileSyncSpy = jest.spyOn(fs, "readFileSync");
      writeFileSyncSpy = jest.spyOn(fs, "writeFileSync");

      readFileSyncSpy.mockReturnValue(
        "const thisConfig = getConfig(user, 'CONFIG_KEY')"
      );
      writeFileSyncSpy.mockImplementation();
    });

    test("bad extension", () => {
      replaceStaleConfigs("file.unsupported-extension");
      expect(readFileSyncSpy).not.toHaveBeenCalled();
      expect(writeFileSyncSpy).not.toHaveBeenCalled();
    });

    test("valid extension and replacement", () => {
      // You may need to modify the logic of how the replacement is done
      replaceStaleConfigs("file.ts");
      const expectedReplacedContent = "const thisConfig = {};";

      expect(writeFileSyncSpy).toHaveBeenCalledWith(
        "file.ts",
        expectedReplacedContent,
        "utf-8"
      );
    });

    afterEach(() => {
      readFileSyncSpy.mockClear();
      writeFileSyncSpy.mockClear();
    });
  });
});
