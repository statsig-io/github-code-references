import Utils, { ParseTargetType } from "../src/utils/Utils";

describe("parseProjectData", () => {
  const sampleData = {
    projects: [
      {
        feature_gates: [
          {
            name: "gate1",
            enabled: true,
            defaultValue: "default1",
            checksInPast30Days: 100,
            gateType: "public",
          },
          {
            name: "gate2",
            enabled: false,
            defaultValue: "default2",
            checksInPast30Days: 50,
            gateType: "private",
          },
        ],
        dynamic_configs: [
          {
            name: "config1",
            enabled: true,
            defaultValue: "value1",
            checksInPast30Days: 200,
          },
          {
            name: "config2",
            enabled: false,
            defaultValue: "value2",
            checksInPast30Days: 150,
          },
        ],
      },
    ],
  };

  test("should parse Feature Gates", () => {
    const result = Utils.parseProjectData(
      sampleData,
      ParseTargetType.FEATURE_GATES
    );
    const expected = new Map([
      [
        "gate1",
        {
          enabled: true,
          defaultValue: "default1",
          checksInPast30Days: 100,
          gateType: "public",
        },
      ],
      [
        "gate2",
        {
          enabled: false,
          defaultValue: "default2",
          checksInPast30Days: 50,
          gateType: "private",
        },
      ],
    ]);

    expect(result).toEqual(expected);
  });

  test("should parse Dynamic Configs", () => {
    const result = Utils.parseProjectData(
      sampleData,
      ParseTargetType.DYNAMIC_CONFIGS
    );
    const expected = new Map([
      [
        "config1",
        {
          enabled: true,
          defaultValue: "value1",
          checksInPast30Days: 200,
          gateType: undefined,
        },
      ],
      [
        "config2",
        {
          enabled: false,
          defaultValue: "value2",
          checksInPast30Days: 150,
          gateType: undefined,
        },
      ],
    ]);

    expect(result).toEqual(expected);
  });

  test("should return null for undefined data", () => {
    const result = Utils.parseProjectData({}, "Feature Gates");
    expect(result).toBeNull();
  });
});
