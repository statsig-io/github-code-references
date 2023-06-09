import * as core from "@actions/core";
import axios, { AxiosError, AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';
import GateData from "../data_classes/GateData";
import DynamicConfigData, { DynamicConfig } from "../data_classes/DynamicConfigData";

export const ColorReset = "\x1b[0m"
export enum ForegroundColor {
  Blue = "\x1b[34m",
  Green = "\x1b[32m",
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

  public static getGithubDirectory() {
    return process.env.GITHUB_WORKSPACE;
  }

  public static getGithubEventName() {
    console.log(process.env.GITHUB_EVENT_NAME);
    return process.env.GITHUB_EVENT_NAME;
  }

  public static isGithubEventSchedule() {
    return this.getGithubEventName() == 'schedule';
  }

  public static getRepoOwner() {
    const repo = process.env.GITHUB_REPOSITORY.split('/'); // owner/repo
    return repo[0];
  }

  public static getRepoName() {
    const repo = process.env.GITHUB_REPOSITORY.split('/'); // owner/repo
    return repo[1];
  }

  public static getPullRequestNum() {
    const githubRef = process.env.GITHUB_REF.split('/'); // refs/pulls/pr_num/merge
    return githubRef[2];
  }

  public static getPullRefName() {
    const githubRefName = process.env.GITHUB_REF_NAME;
    return githubRefName;
  }

  public static async createGithubPullRequest(gitubToken: string) {
    const retries = 7;
    const timeout = 200000;
    axiosRetry(axios, {
      retries: retries,
    });

    const githubOwner = Utils.getRepoOwner();
    const repoName = Utils.getRepoName();

    const pullRequestData = {
      "title": "Clean stale Gates and Configs",

    }

    console.log('GITHUB_HEAD_REF:', process.env.GITHUB_HEAD_REF)
    console.log('GITHUB_BASE_REF:', process.env.GITHUB_BASE_REF)
    console.log('GITHUB_REF:', process.env.GITHUB_REF)
    console.log('GITHUB_REF_NAME:', process.env.GITHUB_REF_NAME)

    let result: AxiosResponse | undefined;
    // try {
    //   result = await axios.post(
    //       `https://api.github.com/repos/${githubOwner}/${repoName}/pulls`,
    //       pullRequestData,
    //       {
    //           headers: {
    //               'Authorization': `Bearer ${gitubToken}`,
    //               'Accept': 'application/vnd.github+json',
    //           },
    //           timeout: timeout, // Sometimes the delay is greater than the speed GH workflows can get the data
    //       }
    //   )
    // } catch (e: unknown) {
    //     result = (e as AxiosError)?.response;
    //     throw Error(`Error Requesting after ${retries} attempts`);
    // }

    // return result;
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

  // Uses local variables to get repo owner and repo name
  public static getGithubSearchURL(query: string) {
    const repoOwner = Utils.getRepoOwner();
    const repoName = Utils.getRepoName();
    const searchUrl = `https://github.com/search?q=repo%3A${repoOwner}%2F${repoName}+${query}&type=code`;
    return searchUrl;
  }

  // Controls the format of the gate outputs
  public static outputFinalGateData(allGateData: GateData[]) {
    console.log('---------- Feature Gates ----------')
    for (const gateData of allGateData) {
      console.log('File:', gateData.fileName)
      console.log('Location:', gateData.fileDir)

      for (const gate of gateData.gates) {
        // Set the Gate names to display as the color Blue
        const gateName = gate.gateName;
        const gateUrl = Utils.getGithubSearchURL(gateName);

        console.log(`\t${ForegroundColor.Blue}Gate: ${gateName}${ColorReset}`)
        console.log(`\t${ForegroundColor.Blue}Url: ${gateUrl}${ColorReset}`)

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
    
    const configName = config.configName;
    const configUrl = Utils.getGithubSearchURL(configName);

    console.log(`\t${ForegroundColor.Blue}Dynamic Config: ${configName} ${ColorReset}`)
    console.log(`\t${ForegroundColor.Blue}Url: ${configUrl} ${ColorReset}`)

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