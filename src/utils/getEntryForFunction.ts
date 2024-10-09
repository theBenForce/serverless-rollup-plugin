import path from 'node:path';
import tmp from 'tmp';
import glob from 'fast-glob';
import type Serverless from 'serverless';
import type { FunctionDefinitionHandler } from 'serverless';
import { Logging } from 'serverless/classes/Plugin.js'; // eslint-disable-line n/no-missing-import
import { CopyFilesEntry } from './copyFiles.js'; // eslint-disable-line import/no-cycle

export interface FunctionEntry {
  source: string;
  destination: string;
  handler: string;
  handlerFile: string;
  function: FunctionDefinitionHandler & {
    dependencies: string[];
    copyFiles?: CopyFilesEntry[];
  };
}

export const getHandlerEntry = (handler: string) => /.*\.(.*)?$/.exec(handler)?.[1];

export const getHandlerFile = (handler: string) => /(.*)\..*?$/.exec(handler)?.[1];

function getEntryExtension(
  serverless: Serverless,
  ignore: Array<string>,
  fileName: string,
  name: string,
  { log }: Logging,
) {
  const preferredExtensions = ['.js', '.ts', '.jsx', '.tsx'];

  const files: Array<string> = glob.sync(`${fileName}.*`, {
    cwd: serverless.config.servicePath,
    onlyFiles: true,
    ignore,
  });

  if (!files?.length) {
    // If we cannot find any handler we should terminate with an error
    throw new Error(
      `No matching handler found for '${fileName}' in '${serverless.config.servicePath}'. Check your service definition (function ${name}).`,
    );
  }

  const sortedFiles = files
    .filter((file) => preferredExtensions.find((x) => x === path.extname(file)))
    .sort((a, b) => a.length - b.length)
    .concat(files) // eslint-disable-line unicorn/prefer-spread
    .reduce((current: Array<string>, next: string) => {
      const nextLower = next.toLowerCase();
      if (!current.some((x) => x.toLowerCase() === nextLower)) {
        current.push(next);
      }

      return current;
    }, []);

  if (sortedFiles.length > 1) {
    log.info(
      `WARNING: More than one matching handlers found for '${fileName}'. Using '${sortedFiles[0]}'. Function ${name}`,
    );
  }
  return path.extname(sortedFiles[0]);
}

export default (
  serverless: Serverless,
  ignore: Array<string>,
  serverlessFunction: FunctionDefinitionHandler & {
    dependencies?: string[];
  },
  logging: Logging,
): FunctionEntry => {
  const baseDir = tmp.dirSync({ prefix: serverlessFunction.name });

  const handlerFile = getHandlerFile(serverlessFunction.handler);
  const handlerEntry = getHandlerEntry(serverlessFunction.handler);

  if (!handlerFile) {
    throw new Error(
      `\nWARNING: Entry for ${serverlessFunction.name}@${serverlessFunction.handler} could not be retrieved.\nPlease check your service config if you want to use lib.entries.`,
    );
  }
  const ext = getEntryExtension(
    serverless,
    ignore,
    handlerFile,
    serverlessFunction.name,
    logging,
  );
  serverlessFunction.handler = `index.${handlerEntry}`; // eslint-disable-line no-param-reassign

  return {
    source: `./${handlerFile}${ext}`,
    destination: baseDir.name,
    handler: serverlessFunction.handler,
    handlerFile,
    function: Object.assign(serverlessFunction, {
      dependencies: serverlessFunction.dependencies ?? [],
    }),
  };
};
