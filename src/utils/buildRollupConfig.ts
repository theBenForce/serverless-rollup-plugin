import { FunctionEntry } from "./getEntryForFunction";
import { RollupOptions, RollupCache } from "rollup";
import path from "path";

export default (
  functionEntry: FunctionEntry,
  rollupConfig: RollupOptions,
  cache: RollupCache
): RollupOptions => {
  let configOutput: any = {
    format: "cjs",
    sourcemap: true
  };
  if (rollupConfig && rollupConfig.output) {
    configOutput = rollupConfig.output;
  }
  configOutput.file = path.join(functionEntry.destination, `index.js`);
  return {
    output: configOutput,
    ...rollupConfig,
    input: functionEntry.source,
    cache
  };
};
