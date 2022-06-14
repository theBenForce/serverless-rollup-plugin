import { join, dirname } from 'node:path';
import { mkdir, copyFile } from 'node:fs/promises';
import Serverless from 'serverless';
import { globbySync as globby } from 'globby';
import { FunctionEntry } from './getEntryForFunction.js'; // eslint-disable-line import/no-cycle

interface CopyFilesAdvanced {
  glob: string;
  srcBase?: string;
  destination?: string;
}

export type CopyFilesEntry = string | CopyFilesAdvanced;

function getCopyFiles(functionEntry: FunctionEntry): Array<CopyFilesAdvanced> {
  return functionEntry.function.copyFiles?.map((entry) => {
    if (typeof entry === 'string') {
      return { glob: entry };
    }
    return entry;
  });
}

export default async (serverless: Serverless, functionEntry: FunctionEntry) => {
  const copyFiles = getCopyFiles(functionEntry);

  await Promise.all(copyFiles.map((entry) => {
    const files = globby([entry.glob]);

    serverless.cli.log(`Copying: ${JSON.stringify(files)}`);

    return Promise.all(
      files.map(async (filename) => {
        let destination = filename;
        if (entry.srcBase) {
          destination = filename.replace(entry.srcBase, '');
        }
        if (entry.destination) {
          destination = join(entry.destination, destination);
        }
        destination = join(functionEntry.destination, destination);
        const destDir = dirname(destination);

        await mkdir(destDir, { recursive: true });

        serverless.cli.log(`Copying ${filename} to ${destination}...`);
        await copyFile(filename, destination);
      }),
    );
  }));
};
