import { FunctionEntry } from "./getEntryForFunction";
import { RollupOptions, RollupCache } from "rollup";
import path from "path";

export const buildInputConfig = (
  input: string,
  rollupConfig: RollupOptions,
  cache: RollupCache
): RollupOptions => ({
    ...rollupConfig,
    input,
    cache
  });

export const buildOutputConfig = (
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
    cache
  };
};
