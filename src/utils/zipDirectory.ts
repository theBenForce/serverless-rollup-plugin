import * as path from "path";
import archiver from "archiver";
import fs from "fs";
import Serverless from "serverless";

const glob = require("fast-glob");

export default async (
  serverless: Serverless,
  source: string,
  name: string
): Promise<string> => {
  const zip = archiver("zip");

  const artifactPath = path.join(
    serverless.config.servicePath,
    ".serverless",
    `${name}.zip`
  );
  serverless.cli.log(`Compressing to ${artifactPath}`);
  serverless.utils.writeFileDir(artifactPath);

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
};
