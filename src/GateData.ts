interface Gates {
    line: string;
    gateName: string;
    enabled: boolean;
    defaultValue: string;
    checksInPast30Days: string;
}

export default class GateData {

    private _fileDir: string;
    private _fileName: string;
    private _gates: Gates[];

    constructor(fileDir: string, fileName: string, gates: Gates[]) {
        this.fileDir = fileDir;
        this.fileName = fileName;
        this.gates = gates;
    }

    public get fileDir(): string {
        return this._fileDir;
    }

    public set fileDir(value: string) {
        this._fileDir = value;
    }

    public get fileName(): string {
        return this._fileName;
    }

    public set fileName(value: string) {
        this._fileName = value;
    }

    public get gates(): Gates[] {
        return this._gates;
    }

    public set gates(value: Gates[]) {
        this._gates = value;
    }
}