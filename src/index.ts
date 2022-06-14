import path from 'node:path';
import { RollupOptions, OutputChunk, OutputAsset } from 'rollup';
import map from 'p-map';
import Serverless, { FunctionDefinitionHandler } from 'serverless';
import Plugin, { Logging } from 'serverless/classes/Plugin.js'; // eslint-disable-line n/no-missing-import
import { cpus } from 'node:os';
import loadRollupConfig from './utils/loadRollupConfig.js';
import zipDirectory from './utils/zipDirectory.js';
import getEntryForFunction, { FunctionEntry } from './utils/getEntryForFunction.js';
import { CustomConfiguration } from './customConfiguration.js';
import { buildBundle, outputBundle } from './utils/rollupFunctionEntry.js';
import installDependencies from './utils/installDependencies.js';
import copyFiles from './utils/copyFiles.js';

const concurrency = cpus().length;

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
    private logging: Logging, // eslint-disable-line no-unused-vars
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
      .filter((functionDefinition: FunctionDefinitionHandler) => (functionDefinition.runtime ?? runtime)?.toLowerCase().startsWith('node'))
      .map((functionDefinition: FunctionDefinitionHandler) => getEntryForFunction(
        this.serverless,
        this.configuration.excludeFiles,
        functionDefinition,
        this.logging,
      ))
      .reduce((entries: Map<string, FunctionEntry[]>, entry: FunctionEntry) => {
        entries.set(entry.source, [...(entries.get(entry.source) ?? []), entry]);

        return entries;
      }, new Map<string, FunctionEntry[]>());

    this.rollupConfig = await loadRollupConfig(
      this.serverless,
      this.configuration.config,
      this.logging,
    );
  }

  async rollupFunction() {
    const installCommand = this.configuration.installCommand || 'npm install';

    // eslint-disable-next-line no-restricted-syntax
    for (const [input, functionEntries] of this.entries.entries()) {
      this.logging.log.info(`Bundling ${input}`);
      // eslint-disable-next-line no-await-in-loop
      const bundle = await buildBundle(input, this.rollupConfig);

      // eslint-disable-next-line no-await-in-loop
      await map(functionEntries, async (functionEntry) => {
        this.logging.log.info(`.: Function ${functionEntry.function.name} :.`);

        this.logging.log.info(`${functionEntry.function.name}: Creating config for ${functionEntry.source}`);
        try {
          this.logging.log.info(`${functionEntry.function.name}: Outputting bundle to ${functionEntry.destination}`);

          const rollupOutput = await outputBundle(
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

          this.logging.log.info(`${functionEntry.function.name}: Excluded the following imports: ${excludedLibraries.join(', ')}`);

          await installDependencies(
            functionEntry,
            this.configuration.dependencies || [],
            installCommand,
            this.logging,
          );

          if (functionEntry.function.copyFiles) {
            await copyFiles(functionEntry, this.logging);
          }

          this.logging.log.info(`${functionEntry.function.name}: Creating zip file for ${functionEntry.function.name}`);
          const artifactPath = await zipDirectory(
            this.serverless,
            functionEntry.destination,
            functionEntry.function.name,
            this.logging,
          );

          this.logging.log.info(`${functionEntry.function.name}: Path to artifact: ${artifactPath}`);

          functionEntry.function.package = { // eslint-disable-line no-param-reassign
            artifact: path.relative(
              this.serverless.config.servicePath,
              artifactPath,
            ),
          };
        } catch (error) {
          this.logging.log.info(`${functionEntry.function.name}: Error while packaging ${functionEntry.source}: ${error.message}`);

          throw error;
        }
      }, { concurrency });
    }
  }

  async cleanup() {} // eslint-disable-line class-methods-use-this,no-empty-function
}
