import Serverless from "serverless";
import Plugin from "serverless/classes/Plugin";

import { RollupOptions, OutputChunk, OutputAsset } from "rollup";
import loadRollupConfig from "./utils/loadRollupConfig";
import zipDirectory from "./utils/zipDirectory";
import getEntryForFunction, {
  FunctionEntry
} from "./utils/getEntryForFunction";
import { CustomConfiguration } from "./customConfiguration";
import rollupFunctionEntry from "./utils/rollupFunctionEntry";
import installDependencies from "./utils/installDependencies";
import path from "path";
import copyFiles from "./utils/copyFiles";

export default class ServerlessRollupPlugin implements Plugin {
  readonly hooks: { [key: string]: any };
  readonly name: string;
  configuration: CustomConfiguration;
  rollupConfig: RollupOptions;
  entries: Map<string, FunctionEntry>;

  constructor(
    private serverless: Serverless,
    private options: Serverless.Options
  ) {
    this.name = "serverless-rollup";
    this.configuration = this.serverless.service.custom
      .rollup as CustomConfiguration;

    this.hooks = {
      "before:package:createDeploymentArtifacts": () =>
        this.prepare().then(this.rollupFunction.bind(this)),
      "after:package:createDeploymentArtifacts": () => this.cleanup(),
      "before:deploy:function:packageFunction": () =>
        this.prepare().then(this.rollupFunction.bind(this))
    };
  }

  async prepare() {
    const functions = this.options.function
      ? [this.options.function]
      : this.serverless.service.getAllFunctions();

    this.entries = functions
      .map(functionName => this.serverless.service.getFunction(functionName))
      .filter((functionDefinition: Serverless.FunctionDefinition) =>
        functionDefinition.runtime.toLowerCase().startsWith("node")
      )

      .map((functionDefinition: Serverless.FunctionDefinition) =>
        getEntryForFunction(
          this.serverless,
          this.configuration.excludeFiles,
          // @ts-ignore
          functionDefinition
        )
      )
      .reduce((entries: Map<string, FunctionEntry>, entry: FunctionEntry) => {
        if (!entries.has(entry.handlerFile)) {
          entries.set(entry.handlerFile, entry);
        }

        return entries;
      }, new Map<string, FunctionEntry>());

    this.rollupConfig = await loadRollupConfig(
      this.serverless,
      this.configuration.config
    );
  }

  async rollupFunction() {
    const installCommand = this.configuration.installCommand || "npm install";

    for (const functionEntry of this.entries.values()) {
      this.serverless.cli.log(`.: Function ${functionEntry.function.name} :.`);

      this.serverless.cli.log(`Creating config for ${functionEntry.source}`);
      try {
        this.serverless.cli.log(`Bundling to ${functionEntry.destination}`);

        const rollupOutput = await rollupFunctionEntry(
          functionEntry,
          this.rollupConfig
        );

        const excludedLibraries = rollupOutput.output.reduce(
          (current: Array<string>, output: OutputChunk | OutputAsset) => {
            if (output.type === "chunk" && output.imports) {
              current.push(...output.imports);
            }

            return current;
          },
          []
        );

        this.serverless.cli.log(
          `Excluded the following imports: ${excludedLibraries.join(", ")}`
        );

        await installDependencies(
          this.serverless,
          functionEntry,
          this.configuration.dependencies || [],
          installCommand
        );

        if (functionEntry.function.copyFiles) {
          await copyFiles(this.serverless, functionEntry);
        }

        this.serverless.cli.log(
          `Creating zip file for ${functionEntry.function.name}`
        );
        const artifactPath = await zipDirectory(
          this.serverless,
          functionEntry.destination,
          functionEntry.function.name
        );

        this.serverless.cli.log(`Path to artifact: ${artifactPath}`);

        // @ts-ignore
        functionEntry.function.package = {
          artifact: path.relative(
            this.serverless.config.servicePath,
            artifactPath
          )
        };
      } catch (ex) {
        this.serverless.cli.log(
          `Error while packaging ${functionEntry.source}: ${ex.message}`
        );

        throw ex;
      }
    }
  }

  async cleanup() {}
}

module.exports = ServerlessRollupPlugin;
