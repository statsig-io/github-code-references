import * as core from "@actions/core";

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

  public static parseProjects(data: object) {

    if (!data) {
      return [];
    }
    
    const projectData = data["projects"];
    let allInfo = [];

    projectData.forEach(function(project) {
      project["feature_gates"].forEach((function(feature_gate) {
        allInfo.push({
          "name": feature_gate["name"],
          "enabled": feature_gate["enabled"],
          "defaultValue": feature_gate["defaultValue"],
        })
      }))
    })

    return allInfo;
  };
}