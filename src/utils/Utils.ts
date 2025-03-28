import * as core from "@actions/core";
import axios, { AxiosError, AxiosResponse } from "axios";

import DynamicConfigData, {
  DynamicConfig,
} from "../data_classes/DynamicConfigData";
import GateData from "../data_classes/GateData";
import GithubUtils from "./GithubUtils";

import axiosRetry = require("axios-retry");

export const ColorReset = "\x1b[0m";
export enum ForegroundColor {
  Blue = "\x1b[34m",
  Green = "\x1b[32m",
}

export enum ParseTargetType {
  FEATURE_GATES = "feature_gates",
  DYNAMIC_CONFIGS = "dynamic_configs",
}

export default class Utils {
  public static getKey(): string {
    const sdkKey: string = this.parseInputKey("sdk-key", true);
    core.setSecret(sdkKey);
    return sdkKey;
  }

  public static getGithubKey(): string {
    const githubKey: string = this.parseInputKey("github-key", true);
    core.setSecret(githubKey);
    return githubKey;
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

  public static async requestProjectData(
    sdkKey: string,
    timeout: number
  ): Promise<AxiosResponse | undefined> {
    const retries = 7;
    axiosRetry(axios, {
      retries: retries,
    });

    // Post request can fail occassionally, catch this and throw the error if so
    let result: AxiosResponse | undefined;
    try {
      result = await axios.post(
        "https://latest.statsigapi.net/developer/v1/projects", // This will change to prod when completed
        null,
        {
          headers: {
            "statsig-api-key": sdkKey, // sdkKey,
            "Content-Type": "application/json",
          },
          timeout: timeout, // Sometimes the delay is greater than the speed GH workflows can get the data
        }
      );
    } catch (e: unknown) {
      result = (e as AxiosError)?.response;
      throw Error(
        `Error Requesting after ${retries} attempts: ${
          (e as AxiosError).message
        }`
      );
    }

    return result;
  }

  // Parses through statsig project data for targetType (Feature Gates or Dynamic Configs)
  public static parseProjectData(
    data: object,
    targetType: string
  ): Map<string, {}> | null {
    if (!data) {
      return null;
    }

    let projectData = data["projects"];
    if (!projectData || projectData.length === 0) {
      return null;
    }

    let allTypeInfo = new Map<string, {}>();

    for (const project of projectData) {
      for (const target of project[targetType]) {
        // Either Feature Gates or Dynamic Configs
        allTypeInfo.set(target["name"], {
          enabled: target["enabled"],
          defaultValue: target["defaultValue"],
          checksInPast30Days: target["checksInPast30Days"],
          // Only feature gates have a gateType value
          gateType:
            targetType === ParseTargetType.FEATURE_GATES
              ? target["gateType"]
              : undefined,
        });
      }
    }

    return allTypeInfo;
  }

  // Uses local variables to get repo owner and repo name
  public static getGithubSearchURL(query: string) {
    const repoOwner = GithubUtils.getRepoOwner();
    const repoName = GithubUtils.getRepoName();
    const searchUrl = `https://github.com/search?q=repo%3A${repoOwner}%2F${repoName}+${query}&type=code`;
    return searchUrl;
  }

  // Controls the format of the gate outputs
  public static outputFinalGateData(allGateData: GateData[]) {
    console.log("---------- Feature Gates ----------");
    for (const gateData of allGateData) {
      console.log("File:", gateData.fileName);
      console.log("Location:", gateData.fileDir);

      for (const gate of gateData.gates) {
        // Set the Gate names to display as the color Blue
        const gateName = gate.gateName;
        const gateUrl = Utils.getGithubSearchURL(gateName);

        console.log(`\t${ForegroundColor.Blue}Gate: ${gateName}${ColorReset}`);
        console.log(`\t${ForegroundColor.Blue}Url: ${gateUrl}${ColorReset}`);

        // Print all necessary gate properities
        for (const gateProp in gate) {
          if (gateProp != "gateName") {
            // Already printed name above, do not reprint
            console.log(`\t\t${gateProp}: ${gate[gateProp]}`);
          }
        }
        console.log(); // Leave a space between each Gate and file
      }
    }
  }

  public static outputFinalConfigData(allConfigData: DynamicConfigData[]) {
    console.log("---------- Dynamic Configs ----------");
    // Iterate over every file with configs
    for (const configData of allConfigData) {
      console.log("File:", configData.fileName);
      console.log("Location:", configData.fileDir);

      // Get a specific dynamic config within that file
      for (const config of configData.dynamicConfigs) {
        Utils.outputDynamicConfig(config);
      }
    }
  }

  // Output an individual DynamicConfig objects data
  private static outputDynamicConfig(config: DynamicConfig) {
    const configName = config.configName;
    const configUrl = Utils.getGithubSearchURL(configName);

    console.log(
      `\t${ForegroundColor.Blue}Dynamic Config: ${configName} ${ColorReset}`
    );
    console.log(`\t${ForegroundColor.Blue}Url: ${configUrl} ${ColorReset}`);

    // Print all necessary config properities
    for (const configProp in config) {
      // Already printed name above, do not reprint
      if (configProp != "configName" && configProp != "defaultValue") {
        console.log(`\t\t${configProp}: ${config[configProp]}`);
      } else if (configProp == "defaultValue") {
        // Default value for Dynamic Configs are objects
        const defaultValues = config[configProp];
        console.log(`\t\tDefaultValues:`);

        for (const value in defaultValues) {
          console.log(`\t\t\t${value}: ${defaultValues[value]}`);
        }
      }
    }
    console.log(); // Leave a space between each Gate and file
  }
}
