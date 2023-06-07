export interface DynamicConfig {
    line: string;
    configName: string;
    enabled: boolean;
    defaultValue: Object;
    checksInPast30Days: string;
}

export default class DynamicConfigData {

    private _fileDir: string;
    private _fileName: string;
    private _dynamicConfigs: DynamicConfig[];

    constructor(fileDir: string, fileName: string, configs: DynamicConfig[]) {
        this.fileDir = fileDir;
        this.fileName = fileName;
        this.dynamicConfigs = configs;
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

    public get dynamicConfigs(): DynamicConfig[] {
        return this._dynamicConfigs;
    }
    public set dynamicConfigs(value: DynamicConfig[]) {
        this._dynamicConfigs = value;
    }
}