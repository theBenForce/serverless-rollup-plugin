import * as Serverless from "serverless";
import Plugin = require("serverless/classes/Plugin");
import * as _ from "lodash";
import glob from "glob";
import * as path from "path";
import rollup from "rollup";
import archiver from "archiver";
import fs from "fs";
import execa from "execa";
import tmp from "tmp";

interface FunctionEntry {
  source: string;
  destination: string;
  handler: string;
  function: Serverless.FunctionDefinition & {
    dependencies?: string[];
  };
}

interface CustomConfiguration {
  config: string | rollup.RollupOptions;
  excludeFiles?: Array<string>;
  installCommand?: string;
}

export default class ServerlessRollupPlugin implements Plugin {
  readonly hooks: { [key: string]: any };
  readonly name: string;
  configuration: CustomConfiguration;
  rollupConfig: rollup.RollupOptions;
  entries: { [key: string]: FunctionEntry };

  constructor(private serverless: Serverless, private options: any) {
    this.name = "serverless-rollup";
    this.configuration = this.serverless.service.custom
      .rollup as CustomConfiguration;

    this.hooks = {
      "before:package:createDeploymentArtifacts": () =>
        this.prepare().then(this.rollup.bind(this)),
      "after:package:createDeploymentArtifacts": () => this.cleanup(),
      "before:deploy:function:packageFunction": () =>
        this.prepare().then(this.rollup.bind(this))
    };
  }

  async prepare() {
    const functions = this.serverless.service.getAllFunctions();

    this.entries = functions.reduce((entries, func) => {
      const entry = this.getEntryForFunction(
        func,
        this.serverless.service.getFunction(func)
      );
      return { ...entries, ...entry };
    }, {});

    this.loadRollupConfig();
  }

  private loadRollupConfig() {
    if (typeof this.configuration.config === "string") {
      const rollupConfigFilePath = path.join(
        this.serverless.config.servicePath,
        this.configuration.config
      );
      if (!this.serverless.utils.fileExistsSync(rollupConfigFilePath)) {
        throw new Error(
          "The rollup plugin could not find the configuration file at: " +
            rollupConfigFilePath
        );
      }
      try {
        this.rollupConfig = require(rollupConfigFilePath);
      } catch (err) {
        this.serverless.cli.log(
          `Could not load rollup config '${rollupConfigFilePath}'`
        );
        throw err;
      }
    } else {
      this.rollupConfig = this.configuration.config;
    }
  }

  async zipDirectory(source: string, name: string): Promise<string> {
    const zip = archiver.create("zip");

    const artifactPath = path.join(
      this.serverless.config.servicePath,
      ".serverless",
      `${name}.zip`
    );
    this.serverless.utils.writeFileDir(artifactPath);

    const output = fs.createWriteStream(artifactPath);

    const files = glob.sync("**", {
      cwd: source,
      dot: true,
      silent: true,
      follow: true
    });

    if (files.length === 0) {
      throw new Error(`Packing ${name}: No files found`);
    }

    output.on("open", () => {
      zip.pipe(output);

      files.forEach((filePath: string) => {
        const fullPath = path.resolve(source, filePath);
        const stats = fs.statSync(fullPath);

        if (!stats.isDirectory()) {
          zip.append(fs.readFileSync(fullPath), {
            name: filePath,
            mode: stats.mode,
            date: new Date(0) // Trick to get the same hash when zipping
          });
        }
      });

      zip.finalize();
    });

    return new Promise((resolve, reject) => {
      zip.on("error", reject);
      output.on("close", () => resolve(artifactPath));
    });
  }

  async rollup() {
    const rollupLib = require("rollup");

    const installCommand = this.configuration.installCommand || "npm install";

    for (const handlerFile of Object.keys(this.entries)) {
      const input = this.entries[handlerFile];
      this.serverless.cli.log(`Creating config for ${input.source}`);

      const config = {
        input: input.source,
        output: {
          file: path.join(input.destination, `index.js`),
          format: "cjs",
          sourcemap: true
        },
        ...this.rollupConfig
      } as rollup.RollupOptions;

      this.serverless.cli.log(`Bundling to ${input.destination}`);
      const bundle = await rollupLib.rollup(config);
      await bundle.write(config.output);

      const functionDependencies = input.function.dependencies;
      if (functionDependencies) {
        this.serverless.cli.log(
          `Installing ${functionDependencies.length} dependencies`
        );

        const pkg = require(path.join(process.cwd(), "package.json"));
        const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
        const missingDeps = functionDependencies.filter(
          (dep: string) => !dependencies[dep]
        );

        if (missingDeps.length) {
          this.serverless.cli.log(
            `Please install the following dependencies in your project: ${missingDeps.join(
              " "
            )}`
          );
        }

        const finalDependencies = functionDependencies.map(
          (dep: string) => `${dep}@${dependencies[dep]}`
        );

        const finalInstallCommand = [installCommand, ...finalDependencies].join(
          " "
        );
        this.serverless.cli.log(
          `Executing ${finalInstallCommand} in ${input.destination}`
        );

        await execa(finalInstallCommand, {
          cwd: input.destination,
          shell: true
        });
      }

      this.serverless.cli.log(`Creating zip file for ${input.function.name}`);
      const artifactPath = await this.zipDirectory(
        input.destination,
        input.function.name
      );

      this.serverless.cli.log(`Path to artifact: ${artifactPath}`);

      // @ts-ignore
      input.function.package = {
        artifact: artifactPath
      };
    }
  }

  async cleanup() {}

  private getHandlerFile(handler: string) {
    // Check if handler is a well-formed path based handler.
    const handlerEntry = /(.*)\..*?$/.exec(handler);
    if (handlerEntry) {
      return handlerEntry[1];
    }
  }

  private getHandlerEntry(handler: string) {
    // Check if handler is a well-formed path based handler.
    const handlerEntry = /.*\.(.*)?$/.exec(handler);
    if (handlerEntry) {
      return handlerEntry[1];
    }
  }

  private getEntryForFunction(
    name: string,
    serverlessFunction: Serverless.FunctionDefinition
  ): { [key: string]: FunctionEntry } {
    const baseDir = tmp.dirSync({ prefix: "serverless-rollup-plugin-" });
    const handler = serverlessFunction.handler;

    const handlerFile = this.getHandlerFile(handler);
    const handlerEntry = this.getHandlerEntry(handler);

    if (!handlerFile) {
      _.get(this.serverless, "service.provider.name") !== "google" &&
        this.serverless.cli.log(
          `\nWARNING: Entry for ${name}@${handler} could not be retrieved.\nPlease check your service config if you want to use lib.entries.`
        );
      return {};
    }
    const ext = this.getEntryExtension(handlerFile, name);
    serverlessFunction.handler = `index.${handlerEntry}`;

    // Create a valid entry key
    return {
      [handlerFile]: {
        source: `./${handlerFile}${ext}`,
        destination: baseDir.name,
        handler: serverlessFunction.handler,
        function: serverlessFunction
      }
    };
  }

  private getEntryExtension(fileName: string, name: string) {
    const preferredExtensions = [".js", ".ts", ".jsx", ".tsx"];

    const files = glob.sync(`${fileName}.*`, {
      cwd: this.serverless.config.servicePath,
      nodir: true,
      ignore: this.configuration.excludeFiles
        ? this.configuration.excludeFiles
        : undefined
    });

    if (_.isEmpty(files)) {
      // If we cannot find any handler we should terminate with an error
      throw new Error(
        `No matching handler found for '${fileName}' in '${this.serverless.config.servicePath}'. Check your service definition (function ${name}).`
      );
    }

    // Move preferred file extensions to the beginning
    const sortedFiles = _.uniq(
      _.concat(
        _.sortBy(
          _.filter(files, file =>
            _.includes(preferredExtensions, path.extname(file))
          ),
          a => _.size(a)
        ),
        files
      )
    );

    if (_.size(sortedFiles) > 1) {
      this.serverless.cli.log(
        `WARNING: More than one matching handlers found for '${fileName}'. Using '${_.first(
          sortedFiles
        )}'. Function ${name}`
      );
    }
    return path.extname(_.first(sortedFiles));
  }
}

module.exports = ServerlessRollupPlugin;
