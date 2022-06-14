import path from 'node:path';
import { RollupOptions, OutputChunk, OutputAsset } from 'rollup';
import Serverless from 'serverless';
import Plugin from 'serverless/classes/Plugin.js'; // eslint-disable-line n/no-missing-import
import loadRollupConfig from './utils/loadRollupConfig.js';
import zipDirectory from './utils/zipDirectory.js';
import getEntryForFunction, { FunctionEntry } from './utils/getEntryForFunction.js';
import { CustomConfiguration } from './customConfiguration.js';
import { buildBundle, outputBundle } from './utils/rollupFunctionEntry.js';
import installDependencies from './utils/installDependencies.js';
import copyFiles from './utils/copyFiles.js';

export default class ServerlessRollupPlugin implements Plugin {
  readonly hooks: { [key: string]: any } = {
    'before:package:createDeploymentArtifacts': () => this.prepare().then(this.rollupFunction.bind(this)),
    'after:package:createDeploymentArtifacts': () => this.cleanup(),
    'before:deploy:function:packageFunction': () => this.prepare().then(this.rollupFunction.bind(this)),
  };

  readonly name: string = 'serverless-rollup';

  configuration: CustomConfiguration;

  rollupConfig: RollupOptions;

  entries: Map<string, FunctionEntry[]>;

  constructor(
    private serverless: Serverless, // eslint-disable-line no-unused-vars
    private options: Serverless.Options, // eslint-disable-line no-unused-vars
  ) {
    this.configuration = this.serverless.service.custom.rollup as CustomConfiguration;
  }

  async prepare() {
    const functions = this.options.function
      ? [this.options.function]
      : this.serverless.service.getAllFunctions();

    const runtime = this.serverless.service.provider?.runtime;

    this.entries = functions
      .map((functionName: string) => this.serverless.service.getFunction(functionName))
      .filter((functionDefinition: Serverless.FunctionDefinition) => (functionDefinition.runtime ?? runtime)?.toLowerCase().startsWith('node'))
      .map((functionDefinition: Serverless.FunctionDefinition) => getEntryForFunction(
        this.serverless,
        this.configuration.excludeFiles,
        // @ts-ignore
        functionDefinition,
      ))
      .reduce((entries: Map<string, FunctionEntry[]>, entry: FunctionEntry) => {
        entries.set(entry.source, [...(entries.get(entry.source) ?? []), entry]);

        return entries;
      }, new Map<string, FunctionEntry[]>());

    this.rollupConfig = await loadRollupConfig(
      this.serverless,
      this.configuration.config,
    );
  }

  async rollupFunction() {
    const installCommand = this.configuration.installCommand || 'npm install';

    // eslint-disable-next-line no-restricted-syntax
    for (const [input, functionEntries] of this.entries.entries()) {
      // eslint-disable-next-line no-await-in-loop
      const bundle = await buildBundle(input, this.rollupConfig);

      // eslint-disable-next-line no-restricted-syntax
      for (const functionEntry of functionEntries) {
        this.serverless.cli.log(`.: Function ${functionEntry.function.name} :.`);

        this.serverless.cli.log(`Creating config for ${functionEntry.source}`);
        try {
          this.serverless.cli.log(`Bundling to ${functionEntry.destination}`);

          const rollupOutput = await outputBundle( // eslint-disable-line no-await-in-loop
            bundle,
            functionEntry,
            this.rollupConfig,
          );

          const excludedLibraries = rollupOutput.output.reduce(
            (current: Array<string>, output: OutputChunk | OutputAsset) => {
              if (output.type === 'chunk' && output.imports) {
                current.push(...output.imports);
              }

              return current;
            },
            [],
          );

          this.serverless.cli.log(
            `Excluded the following imports: ${excludedLibraries.join(', ')}`,
          );

          await installDependencies( // eslint-disable-line no-await-in-loop
            this.serverless,
            functionEntry,
            this.configuration.dependencies || [],
            installCommand,
          );

          if (functionEntry.function.copyFiles) {
            await copyFiles(this.serverless, functionEntry); // eslint-disable-line no-await-in-loop
          }

          this.serverless.cli.log(
            `Creating zip file for ${functionEntry.function.name}`,
          );
          const artifactPath = await zipDirectory( // eslint-disable-line no-await-in-loop
            this.serverless,
            functionEntry.destination,
            functionEntry.function.name,
          );

          this.serverless.cli.log(`Path to artifact: ${artifactPath}`);

          // @ts-ignore
          functionEntry.function.package = {
            artifact: path.relative(
              this.serverless.config.servicePath,
              artifactPath,
            ),
          };
        } catch (error) {
          this.serverless.cli.log(
            `Error while packaging ${functionEntry.source}: ${error.message}`,
          );

          throw error;
        }
      }
    }
  }

  async cleanup() {} // eslint-disable-line class-methods-use-this,no-empty-function
}
