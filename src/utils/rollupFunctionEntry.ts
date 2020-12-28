import { buildInputConfig, buildOutputConfig } from "./buildRollupConfig";
import { FunctionEntry } from "./getEntryForFunction";
import rollup, {
  RollupOptions,
  RollupBuild,
  OutputOptions,
  RollupOutput,
  RollupCache,
} from "rollup";

let cache: RollupCache;
export const buildBundle = async (
  input: string,
  rollupConfig: RollupOptions,
) => {
  const config: RollupOptions = buildInputConfig(
    input,
    rollupConfig,
    cache
  );

  const bundle: RollupBuild = await rollup.rollup(config);
  cache = bundle.cache;

  return bundle;
};

export const outputBundle = async (
  bundle: RollupBuild,
  functionEntry: FunctionEntry,
  rollupConfig: RollupOptions,
) => {
  const config: RollupOptions = buildOutputConfig(
    functionEntry,
    rollupConfig,
    cache
  );

  const rollupOutput: RollupOutput = await bundle.write(
    config.output as OutputOptions
  );

  if (!rollupOutput.output?.length) {
    throw new Error(`No build output for ${functionEntry.function.name}`);
  }

  return rollupOutput;
};
