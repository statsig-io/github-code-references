import * as core from "@actions/core";
import GateData from "./GateData";

export default class Utils {
  public static getKey(): string {
    const sdkKey: string = this.parseInputKey("sdk-key", true);
    core.setSecret(sdkKey);
    return sdkKey;
  }

  // Parses the input for the action.yml file
  private static parseInputKey(
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

  // Parses through the project input data and outputs all feature gates
  public static parseProjects(data: object): Map<string, {}> | null{

    if (!data) {
      return null;
    }
    
    let projectData = data["projects"];
    let allInfo = new Map<string, {}>;

    // Loop over every project in data
    projectData.forEach(function(project) {
      // Loop over every feature gate within each project
      project["feature_gates"].forEach(function(feature_gate) {
        allInfo.set(feature_gate["name"],
          {
            "enabled": feature_gate["enabled"],
            "defaultValue": feature_gate["defaultValue"],
          }
        )
      })
    })

    return allInfo;
  };

  public static outputFinalGateData(allGateData: GateData[]) {
    
    allGateData.forEach(function(gateData) {
      console.log('File:', gateData.fileName)
      console.log('Location:', gateData.fileDir)
      gateData.gates.forEach(function(gate) {
        console.log(`\t Gate: ${gate.gateName}`)
        console.log(`\t\tline: ${gate.line} \n\t\tenabled: ${gate.enabled} \n\t\tdefault: ${gate.defaultValue}\n`)
      });
    });

  }

}