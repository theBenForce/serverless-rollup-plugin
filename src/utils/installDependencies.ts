import { join } from 'node:path';
import { cwd } from 'node:process';
import { createRequire } from 'node:module';
import { execa } from 'execa';
import { Logging } from 'serverless/classes/Plugin.js'; // eslint-disable-line n/no-missing-import
import { FunctionEntry } from './getEntryForFunction.js';

export default async (
  functionEntry: FunctionEntry,
  globalDependencies: Array<string>,
  installCommand: string,
  { log }: Logging,
) => {
  const functionDependencies = [...functionEntry.function.dependencies, ...globalDependencies]
    .reduce((current: Array<string>, next: string) => {
      if (!current.includes(next)) {
        current.push(next);
      }

      return current;
    }, []);

  if (!functionDependencies?.length) return;

  log.info(`Installing ${functionDependencies.length} dependencies`);

  const require = createRequire(import.meta.url);
  const pkg = require(join(cwd(), 'package.json')); // eslint-disable-line import/no-dynamic-require
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
  log.info(`Executing ${finalInstallCommand} in ${functionEntry.destination}`);

  await execa(finalInstallCommand, {
    cwd: functionEntry.destination,
    shell: true,
  });
};
