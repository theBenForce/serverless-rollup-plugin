import path from 'node:path';
import Serverless from 'serverless';
import { rollup, RollupOptions } from 'rollup';
import { Logging } from 'serverless/classes/Plugin.js'; // eslint-disable-line n/no-missing-import

const loadScript = async (filename: string): Promise<RollupOptions> => {
  const bundle = await rollup({
    external: () => true,
    input: filename,
    treeshake: false,
  });

  const {
    output: [{ code }],
  } = await bundle.generate({
    exports: 'default',
    format: 'cjs',
  });

  // import only if absolutely necessary
  const { requireFromString } = await import('module-from-string');
  return requireFromString(code);
};

export default async (
  serverless: Serverless,
  config: string | RollupOptions,
  { log }: Logging,
): Promise<RollupOptions> => {
  let rollupConfig: RollupOptions;

  if (typeof config === 'string') {
    const rollupConfigFilePath = path.join(
      serverless.config.servicePath,
      config,
    );
    if (!serverless.utils.fileExistsSync(rollupConfigFilePath)) {
      throw new Error(
        `The rollup plugin could not find the configuration file at: ${
          rollupConfigFilePath}`,
      );
    }
    try {
      rollupConfig = await import(rollupConfigFilePath)
        .then(
          ({ default: rollupConfigExport }) => rollupConfigExport,
          (error) => {
            if (error instanceof SyntaxError) {
              log.warning(`Failed to import ${rollupConfigFilePath}. Will load using commonjs transpilation.`);
              log.warning("Please switch to using 'mjs' extension, or 'type': 'module' in 'package.json', since this feature will be removed in a future release.");

              return loadScript(rollupConfigFilePath);
            }
            throw error;
          },
        );

      if (rollupConfig.input) {
        delete rollupConfig.input;
      }

      log.info(`Loaded rollup config from ${rollupConfigFilePath}`);
    } catch (error) {
      log.info(
        `Could not load rollup config '${rollupConfigFilePath}'`,
      );
      throw error;
    }
  } else {
    rollupConfig = config;
  }

  return rollupConfig;
};
