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
            return [];
        }
        const projectData = data["projects"];
        let allInfo = [];
        projectData.forEach(function (project) {
            project["feature_gates"].forEach((function (feature_gate) {
                allInfo.push({
                    "name": feature_gate["name"],
                    "enabled": feature_gate["enabled"],
                    "defaultValue": feature_gate["defaultValue"],
                });
            }));
        });
        return allInfo;
    }
    ;
}
exports.default = Utils;
//# sourceMappingURL=Utils.js.map