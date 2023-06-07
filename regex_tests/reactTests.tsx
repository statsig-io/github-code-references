// It's okay if there are errors, the script only needs to pick up the gate and config

import { useGate, useConfig } from "statsig-react";

function MyComponent() {
    const { value, isLoading } = useGate("react_gate");
    const { config, isLoading } = useConfig("react_config");
  
    // Only required if you have not set waitForInitialization to true
    if (isLoading) {
      return <div>Fetching Values...</div>;
    }
  
    return <div>{value ? "Passes Gate" : "Fails Gate"}</div>;
  }