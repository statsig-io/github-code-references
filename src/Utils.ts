import * as core from "@actions/core";

export type Inputs = {
  sdkKey: string;
};

export default class Utils {
  public static getKey(): string {
    const sdkKey: string = this.parseInputString("sdk-key", true);
    core.setSecret(sdkKey);
    return sdkKey;
  }

  private static parseInputString(
    key: string,
    required: boolean = false,
    defaultValue: string = ""
  ): string {
    try {
      return core.getInput(key, { required: required });
    } catch (e: unknown) {
      core.setFailed(`Invalid Input (${key}): ${(e as Error).message}`);
    }
    return defaultValue;
  }
}