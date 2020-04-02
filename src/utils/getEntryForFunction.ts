import path from "path";
import tmp from "tmp";
import Serverless, { FunctionDefinition } from "serverless";
const glob = require("fast-glob");

export interface FunctionEntry {
  source: string;
  destination: string;
  handler: string;
  handlerFile: string;
  function: FunctionDefinition & {
    dependencies: string[];
    copyFiles?: string[];
  };
}

export const getHandlerEntry = (handler: string) =>
  /.*\.(.*)?$/.exec(handler)?.[1];

export const getHandlerFile = (handler: string) =>
  /(.*)\..*?$/.exec(handler)?.[1];

function getEntryExtension(
  serverless: Serverless,
  ignore: Array<string>,
  fileName: string,
  name: string
) {
  const preferredExtensions = [".js", ".ts", ".jsx", ".tsx"];

  const files: Array<string> = glob.sync(`${fileName}.*`, {
    cwd: serverless.config.servicePath,
    nodir: true,
    ignore
  });

  if (!files?.length) {
    // If we cannot find any handler we should terminate with an error
    throw new Error(
      `No matching handler found for '${fileName}' in '${serverless.config.servicePath}'. Check your service definition (function ${name}).`
    );
  }

  const sortedFiles = files
    .filter(file => preferredExtensions.find(x => x === path.extname(file)))
    .sort((a, b) => a.length - b.length)
    .concat(files)
    .reduce((current: Array<string>, next: string) => {
      if (!current.find(x => x.toLowerCase() === next.toLowerCase())) {
        current.push(next);
      }

      return current;
    }, []);

  if (sortedFiles.length > 1) {
    serverless.cli.log(
      `WARNING: More than one matching handlers found for '${fileName}'. Using '${sortedFiles[0]}'. Function ${name}`
    );
  }
  return path.extname(sortedFiles[0]);
}

export default (
  serverless: Serverless,
  ignore: Array<string>,
  serverlessFunction: FunctionDefinition & {
    dependencies: string[];
  }
): FunctionEntry => {
  const baseDir = tmp.dirSync({ prefix: serverlessFunction.name });
  const handler = serverlessFunction.handler;

  const handlerFile = getHandlerFile(handler);
  const handlerEntry = getHandlerEntry(handler);

  if (!handlerFile) {
    throw new Error(
      `\nWARNING: Entry for ${serverlessFunction.name}@${handler} could not be retrieved.\nPlease check your service config if you want to use lib.entries.`
    );
  }
  const ext = getEntryExtension(
    serverless,
    ignore,
    handlerFile,
    serverlessFunction.name
  );
  serverlessFunction.handler = `index.${handlerEntry}`;

  if (!serverlessFunction.dependencies) {
    serverlessFunction.dependencies = [];
  }

  return {
    source: `./${handlerFile}${ext}`,
    destination: baseDir.name,
    handler: serverlessFunction.handler,
    handlerFile,
    function: serverlessFunction
  };
};
