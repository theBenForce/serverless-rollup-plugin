import { join } from 'node:path';
import { cwd } from 'node:process';
import { createRequire } from 'node:module';
import Serverless from 'serverless';
import { execa } from 'execa';
import { FunctionEntry } from './getEntryForFunction.js';

export default async (
  serverless: Serverless,
  functionEntry: FunctionEntry,
  globalDependencies: Array<string>,
  installCommand: string,
) => {
  const functionDependencies = [...functionEntry.function.dependencies, ...globalDependencies]
    .reduce((current: Array<string>, next: string) => {
      if (!current.includes(next)) {
        current.push(next);
      }

      return current;
    }, []);

  if (!functionDependencies?.length) return;

  serverless.cli.log(`Installing ${functionDependencies.length} dependencies`);

  const require = createRequire(import.meta.url);
  const pkg = JSON.parse(require(join(cwd(), 'package.json'))); // eslint-disable-line import/no-dynamic-require
  const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
  const missingDeps = functionDependencies.filter(
    (dep: string) => !dependencies[dep],
  );

  if (missingDeps.length > 0) {
    throw new Error(
      `Please install the following dependencies in your project: ${missingDeps.join(
        ' ',
      )}`,
    );
  }

  const finalDependencies = functionDependencies.map(
    (dep: string) => `${dep}@${dependencies[dep]}`,
  );

  const finalInstallCommand = [installCommand, ...finalDependencies].join(' ');
  serverless.cli.log(
    `Executing ${finalInstallCommand} in ${functionEntry.destination}`,
  );

  await execa(finalInstallCommand, {
    cwd: functionEntry.destination,
    shell: true,
  });
};
