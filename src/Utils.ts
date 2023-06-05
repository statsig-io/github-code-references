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
            "checksInPast30Days": feature_gate["checksInPast30Days"],
          }
        )
      })
    })
    return allInfo;
  };

  // Controls the format of the gate outputs
  public static outputFinalGateData(allGateData: GateData[]) {

    for (const gateData of allGateData) {
      console.log('File:', gateData.fileName)
      console.log('Location:', gateData.fileDir)

      for (const gate of gateData.gates) {
        console.log(`\t Gate: ${gate.gateName}`)

        // Print all critical gate properities
        for (const gateProp in gate) {
          if (gateProp != 'gateName') { // Already printed name above, do not reprint
            console.log(`\t\t${gateProp}: ${gate[gateProp]}`)
          }
        }

        console.log(); // Leave a space between each Gate and file
      }
    }
  }
}