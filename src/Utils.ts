import * as core from "@actions/core";
import axios, { AxiosError, AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';
import GateData from "./GateData";
import DynamicConfigData, { DynamicConfig } from "./DynamicConfigData";

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

  public static async requestProjectData(sdkKey: string, timeout: number): Promise<AxiosResponse | undefined> {
    const retries = 7;
    axiosRetry(axios, {
      retries: retries,
    });

    // Post request can fail occassionally, catch this and throw the error if so
    let result: AxiosResponse | undefined;
    try {
      result = await axios.post(
          'https:/latest.statsigapi.net/developer/v1/projects', // This will change to prod when completed
          null,
          {
              headers: {
                  'statsig-api-key': sdkKey, // 'secret-08Bqk5wabXasJhcw5fVVIQ1JUfwBI8IXnAPMqbvaBkS',// sdkKey,
                  'Content-Type': 'application/json',
              },
              timeout: timeout, // Sometimes the delay is greater than the speed GH workflows can get the data
          }
      )
    } catch (e: unknown) {
        result = (e as AxiosError)?.response;
        throw Error(`Error Requesting after ${retries} attempts`);
    }

    return result;
  };

    // Parses through statsig project data for targetType (Feature Gates or Dynamic Configs)
    public static parseProjectData(data: object, targetType: string): Map<string, {}> | null{

      if (!data) {
        return null;
      }
      
      let projectData = data["projects"];
      let allTypeInfo = new Map<string, {}>;
  
      // Loop over every project in data
      for (const project of projectData) {
        for (const target of project[targetType]) { // Either Feature Gates or Dynamic Configs
          allTypeInfo.set(target["name"],
            {
              "enabled": target["enabled"],
              "defaultValue": target["defaultValue"],
              "checksInPast30Days": target["checksInPast30Days"],
            }
          )
        }
      }
      
      return allTypeInfo;
    };

  // Controls the format of the gate outputs
  public static outputFinalGateData(allGateData: GateData[]) {
    console.log('---------- Feature Gates ----------')
    for (const gateData of allGateData) {
      console.log('File:', gateData.fileName)
      console.log('Location:', gateData.fileDir)

      for (const gate of gateData.gates) {
        console.log(`\t Gate: ${gate.gateName}`)

        // Print all necessary gate properities
        for (const gateProp in gate) {
          if (gateProp != 'gateName') { // Already printed name above, do not reprint
            console.log(`\t\t${gateProp}: ${gate[gateProp]}`)
          }
        }
        console.log(); // Leave a space between each Gate and file
      }
    }
  }

  public static outputFinalConfigData(allConfigData: DynamicConfigData[]) {
    console.log('---------- Dynamic Configs ----------')
    // Iterate over every file with configs
    for (const configData of allConfigData) {
      console.log('File:', configData.fileName)
      console.log('Location:', configData.fileDir)

      // Get a specific dynamic config within that file
      for (const config of configData.dynamicConfigs) {
        Utils.outputDynamicConfig(config);
      }
    }
  }

  // Output an individual DynamicConfig objects data
  private static outputDynamicConfig(config: DynamicConfig) {
    
    console.log(`\t Dynamic Config: ${config.configName}`)

    // Print all necessary config properities
    for (const configProp in config) {

      // Already printed name above, do not reprint
      if (configProp != 'configName' && configProp != 'defaultValue') { 
        console.log(`\t\t${configProp}: ${config[configProp]}`)

      } else if (configProp == 'defaultValue') { // Default value for Dynamic Configs are objects
        const defaultValues = config[configProp];
        console.log(`\t\tDefaultValues:`)

        for (const value in defaultValues) {
          console.log(`\t\t\t${value}: ${defaultValues[value]}`);
        }
      }
    }
    console.log(); // Leave a space between each Gate and file
  }
}