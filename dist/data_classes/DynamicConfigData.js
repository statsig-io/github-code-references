"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class DynamicConfigData {
    constructor(fileDir, fileName, configs) {
        this.fileDir = fileDir;
        this.fileName = fileName;
        this.dynamicConfigs = configs;
    }
    get fileDir() {
        return this._fileDir;
    }
    set fileDir(value) {
        this._fileDir = value;
    }
    get fileName() {
        return this._fileName;
    }
    set fileName(value) {
        this._fileName = value;
    }
    get dynamicConfigs() {
        return this._dynamicConfigs;
    }
    set dynamicConfigs(value) {
        this._dynamicConfigs = value;
    }
}
exports.default = DynamicConfigData;
//# sourceMappingURL=DynamicConfigData.js.map