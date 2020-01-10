import buildRollupConfig from "./buildRollupConfig";
import { FunctionEntry } from "./getEntryForFunction";
import rollup, {
  RollupOptions,
  RollupBuild,
  OutputOptions,
  RollupOutput,
  RollupCache
} from "rollup";

let cache: RollupCache;
export default async (
  functionEntry: FunctionEntry,
  rollupConfig: RollupOptions
) => {
  const config: RollupOptions = buildRollupConfig(
    functionEntry,
    rollupConfig,
    cache
  );

  const bundle: RollupBuild = await rollup.rollup(config);
  cache = bundle.cache;

  const rollupOutput: RollupOutput = await bundle.write(
    config.output as OutputOptions
  );

  if (!rollupOutput.output?.length) {
    throw new Error(`No build output for ${functionEntry.function.name}`);
  }

  return rollupOutput;
};
