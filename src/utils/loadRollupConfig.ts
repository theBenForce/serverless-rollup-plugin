import Serverless from "serverless";
import { RollupOptions } from "rollup";
import path from "path";
import * as babel from "@babel/core";

const loadScript = async (filename: string): Promise<RollupOptions> => {
  const transformResult = await babel.transformFileAsync(filename, {
    filename,
    presets: [["@babel/preset-env", { targets: { node: true } }]],
    cwd: process.cwd(),
    sourceRoot: process.cwd(),
    root: process.cwd()
  });

  let script: RollupOptions;
  if (transformResult && transformResult.code) {
    script = eval(transformResult.code);
  }

  // @ts-ignore
  return script;
};

export default async (
  serverless: Serverless,
  config: string | RollupOptions
): Promise<RollupOptions> => {
  let rollupConfig: RollupOptions;

  if (typeof config === "string") {
    const rollupConfigFilePath = path.join(
      serverless.config.servicePath,
      config
    );
    if (!serverless.utils.fileExistsSync(rollupConfigFilePath)) {
      throw new Error(
        "The rollup plugin could not find the configuration file at: " +
          rollupConfigFilePath
      );
    }
    try {
      rollupConfig = await loadScript(rollupConfigFilePath);

      if (rollupConfig.input) {
        delete rollupConfig.input;
      }

      serverless.cli.log(`Loaded rollup config from ${rollupConfigFilePath}`);
    } catch (err) {
      serverless.cli.log(
        `Could not load rollup config '${rollupConfigFilePath}'`
      );
      throw err;
    }
  } else {
    rollupConfig = config;
  }

  return rollupConfig;
};
