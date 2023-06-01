"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core = require("@actions/core");
class Utils {
    static getKey() {
        const sdkKey = this.parseInputString("sdk-key", true);
        core.setSecret(sdkKey);
        return sdkKey;
    }
    static parseInputString(key, required = false, defaultValue = "") {
        try {
            return core.getInput(key, { required: required });
        }
        catch (e) {
            core.setFailed(`Invalid Input (${key}): ${e.message}`);
        }
        return defaultValue;
    }
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