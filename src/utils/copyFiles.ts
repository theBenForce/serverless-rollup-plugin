import { join, dirname } from 'node:path';
import { mkdir, copyFile } from 'node:fs/promises';
import { globby } from 'globby';
import { Logging } from 'serverless/classes/Plugin.js'; // eslint-disable-line n/no-missing-import
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

export default async (functionEntry: FunctionEntry, { log }: Logging) => {
  const copyFiles = getCopyFiles(functionEntry);

  await Promise.all(copyFiles.map(async (entry) => {
    const files = await globby([entry.glob]);

    log.info(`Copying: ${JSON.stringify(files)}`);

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

        log.info(`Copying ${filename} to ${destination}...`);
        await copyFile(filename, destination);
      }),
    );
  }));
};
