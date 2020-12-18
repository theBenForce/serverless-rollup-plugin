import buildRollupConfig from "./buildRollupConfig";
import { FunctionEntry } from "./getEntryForFunction";
import rollup, {
  RollupOptions,
  RollupBuild,
  OutputOptions,
  InputOptions,
  RollupOutput,
  RollupCache
} from "rollup";

const bundlesMemo = new Map<InputOptions, RollupBuild>();
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

  const bundle = bundlesMemo.get(config.input) || await (async () => {
    const bundle: RollupBuild = await rollup.rollup(config);
    cache = bundle.cache;
    bundlesMemo.set(config.input, bundle);
    return bundle;
  })();

  const rollupOutput: RollupOutput = await bundle.write(
    config.output as OutputOptions
  );

  if (!rollupOutput.output?.length) {
    throw new Error(`No build output for ${functionEntry.function.name}`);
  }

  return rollupOutput;
};
