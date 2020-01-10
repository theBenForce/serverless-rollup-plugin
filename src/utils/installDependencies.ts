import { FunctionEntry } from "./getEntryForFunction";
import path from "path";
import Serverless from "serverless";
// @ts-ignore
import execa from "execa";

export default async (
  serverless: Serverless,
  functionEntry: FunctionEntry,
  globalDependencies: Array<string>,
  installCommand: string
) => {
  let functionDependencies = functionEntry.function.dependencies
    .concat(globalDependencies)
    .reduce((current: Array<string>, next: string) => {
      if (!current.find(x => x === next)) {
        current.push(next);
      }

      return current;
    }, []);

  if (!functionDependencies?.length) return;

  serverless.cli.log(`Installing ${functionDependencies.length} dependencies`);

  const pkg = require(path.join(process.cwd(), "package.json"));
  const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
  const missingDeps = functionDependencies.filter(
    (dep: string) => !dependencies[dep]
  );

  if (missingDeps.length) {
    throw new Error(
      `Please install the following dependencies in your project: ${missingDeps.join(
        " "
      )}`
    );
  }

  const finalDependencies = functionDependencies.map(
    (dep: string) => `${dep}@${dependencies[dep]}`
  );

  const finalInstallCommand = [installCommand, ...finalDependencies].join(" ");
  serverless.cli.log(
    `Executing ${finalInstallCommand} in ${functionEntry.destination}`
  );

  await execa(finalInstallCommand, {
    cwd: functionEntry.destination,
    shell: true
  });
};
