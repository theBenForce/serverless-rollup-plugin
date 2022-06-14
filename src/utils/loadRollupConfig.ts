import Serverless from 'serverless';
import { rollup, RollupOptions } from 'rollup';
import path from 'node:path';
import { requireFromString } from 'module-from-string';

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

  return requireFromString(code);
};

export default async (
  serverless: Serverless,
  config: string | RollupOptions,
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
      rollupConfig = await loadScript(rollupConfigFilePath);

      if (rollupConfig.input) {
        delete rollupConfig.input;
      }

      serverless.cli.log(`Loaded rollup config from ${rollupConfigFilePath}`);
    } catch (error) {
      serverless.cli.log(
        `Could not load rollup config '${rollupConfigFilePath}'`,
      );
      throw error;
    }
  } else {
    rollupConfig = config;
  }

  return rollupConfig;
};
