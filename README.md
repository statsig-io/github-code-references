# Github Code References

A Github Action to scan through repositories for Statsig Feature Gates and Dynamic Configs.

It will generate PRs that replace stale gates as well.

## Inputs

### `sdk-key`

**Required** Statsig server SDK key.

### `github-key`

**Required** Github token used for reading repository data and for creating a Pull Request.


## Example usage

```yaml
name: "Get Gates and Configs"

on:
  schedule:
    - cron: "0 */4 * * *"
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  get-project-data:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [16.x]

    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: "npm"

      - name: Setup pnpm
        run: npm install -g pnpm@^7.0

      - name: Install Dependencies
        run: pnpm install

      - name: Find Feature Gates and Dynamic Configs
        id: data
        uses: statsig-io/github-code-references@main # Put in location to Github-Code-References/action.yml here
        with:
          sdk-key: ${{ secrets.SDK_KEY }}
          github-key: ${{ secrets.GH_ACCESS_TOKEN }}
```
