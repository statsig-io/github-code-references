"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class GateData {
    constructor(fileDir, fileName, gates) {
        this.fileDir = fileDir;
        this.fileName = fileName;
        this.gates = gates;
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
    get gates() {
        return this._gates;
    }
    set gates(value) {
        this._gates = value;
    }
}
exports.default = GateData;
//# sourceMappingURL=GateData.js.map