import Serverless from "serverless";
import { FunctionEntry } from "./getEntryForFunction";
import globby from "globby";
import * as path from "path";
import * as fs from "fs";

interface CopyFilesAdvanced {
  glob: string;
  srcBase?: string;
  destination?: string;
}

export type CopyFilesEntry = string | CopyFilesAdvanced;

function getCopyFiles(functionEntry: FunctionEntry): Array<CopyFilesAdvanced> {
  return functionEntry.function.copyFiles?.map(entry => {
    if (typeof entry === "string") {
      return { glob: entry };
    }
    return entry;
  });
}

export default async (serverless: Serverless, functionEntry: FunctionEntry) => {
  const copyFiles = getCopyFiles(functionEntry);

  for (const entry of copyFiles) {
    let files = await globby([entry.glob]);

    serverless.cli.log(`Copying: ${JSON.stringify(files)}`);

    await Promise.all(
      files.map(async filename => {
        let destination = filename;
        if (entry.srcBase) {
          destination = filename.replace(entry.srcBase, "");
        }
        if (entry.destination) {
          destination = path.join(entry.destination, destination);
        }
        destination = path.join(functionEntry.destination, destination);
        const destDir = path.dirname(destination);

        fs.mkdirSync(destDir, { recursive: true });

        serverless.cli.log(`Copying ${filename} to ${destination}...`);
        fs.copyFileSync(filename, destination);
      })
    );
  }
};
