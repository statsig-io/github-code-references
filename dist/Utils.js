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
}
exports.default = Utils;
//# sourceMappingURL=Utils.js.map