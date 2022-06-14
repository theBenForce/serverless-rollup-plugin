import * as path from 'node:path';
import fs from 'node:fs';
import archiver from 'archiver';
import Serverless from 'serverless';
import glob from 'fast-glob';

export default async (
  serverless: Serverless,
  source: string,
  name: string,
): Promise<string> => {
  const zip = archiver('zip');

  const artifactPath = path.join(
    serverless.config.servicePath,
    '.serverless',
    `${name}.zip`,
  );
  serverless.cli.log(`Compressing to ${artifactPath}`);
  serverless.utils.writeFileDir(artifactPath);

  const output = fs.createWriteStream(artifactPath);

  const files = await glob('**', {
    cwd: source,
    dot: true,
    suppressErrors: true,
    followSymbolicLinks: true,
  });

  if (files.length === 0) {
    throw new Error(`Packing ${name}: No files found`);
  }

  zip.pipe(output);

  files.forEach((filePath: string) => {
    const fullPath = path.resolve(source, filePath);
    const stats = fs.statSync(fullPath);

    if (!stats.isDirectory()) {
      zip.append(fs.readFileSync(fullPath), {
        name: filePath,
        mode: stats.mode,
        date: new Date(0), // Trick to get the same hash when zipping
      });
    }
  });

  zip.finalize();

  return new Promise((resolve, reject) => {
    zip.on('error', reject);
    output.on('close', () => resolve(artifactPath));
  });
};
