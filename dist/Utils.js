"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core = require("@actions/core");
class Utils {
    static getKey() {
        const sdkKey = this.parseInputKey("sdk-key", true);
        core.setSecret(sdkKey);
        return sdkKey;
    }
    // Parses the input for the action.yml file
    static parseInputKey(key, required = false, defaultValue = "") {
        try {
            return core.getInput(key, { required: required });
        }
        catch (e) {
            core.setFailed(`Invalid Input (${key}): ${e.message}`);
        }
        return defaultValue;
    }
    // Parses through the project input data and outputs all feature gates
    static parseProjects(data) {
        if (!data) {
            return null;
        }
        let projectData = data["projects"];
        let allInfo = new Map;
        // Loop over every project in data
        projectData.forEach(function (project) {
            // Loop over every feature gate within each project
            project["feature_gates"].forEach(function (feature_gate) {
                allInfo.set(feature_gate["name"], {
                    "enabled": feature_gate["enabled"],
                    "defaultValue": feature_gate["defaultValue"],
                });
            });
        });
        return allInfo;
    }
    ;
    static outputFinalGateData(allGateData) {
        allGateData.forEach(function (gateData) {
            console.log(gateData.fileName);
            console.log('Location:', gateData.fileDir);
            gateData.gates.forEach(function (gate) {
                console.log(`\t Gate: ${gate.gateName}`);
                console.log(`\t\tline: ${gate.line} \n\t\tenabled: ${gate.enabled} \n\t\tdefault: ${gate.defaultValue}\n`);
            });
        });
    }
}
exports.default = Utils;
//# sourceMappingURL=Utils.js.map