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
  const output: any = rollupConfig?.output ?? {
    format: "cjs",
    sourcemap: true
  };

  const file = `index.${output.format === "esm" ? 'mjs' : 'js'}`;
  output.file = path.join(functionEntry.destination, file);

  return {
    ...rollupConfig,
    output,
    cache
  };
};
