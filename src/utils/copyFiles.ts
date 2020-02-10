import Serverless from "serverless";
import { FunctionEntry } from "./getEntryForFunction";
import globby from "globby";
import * as path from "path";
import * as fs from "fs";
import makeDir from "make-dir";

export default async (serverless: Serverless, functionEntry: FunctionEntry) => {
  const copyFiles = functionEntry.function.copyFiles;

  const files = await globby(copyFiles);
  serverless.cli.log(`Copying: ${JSON.stringify(files)}`);

  await Promise.all(
    files.map(async filename => {
      const destination = path.join(functionEntry.destination, filename);
      await makeDir(path.dirname(destination));
      fs.copyFileSync(filename, destination);
    })
  );
};
