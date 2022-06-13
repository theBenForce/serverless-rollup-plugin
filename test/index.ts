import { join } from "path";
import { expect } from "chai";
import StreamZip from "node-stream-zip";
import { importFromStringSync, requireFromString } from 'module-from-string';
import runServerless from "@serverless/test/run-serverless";

const serverlessRoot = join(require.resolve("serverless"), "..", "..");

describe('general', () => {
  it('should package function as cjs', async () => {
    const cwd = join(__dirname, "serverless-basic");
    await runServerless(serverlessRoot, {
        cwd,
        command: "package"
    });

    const zip = new StreamZip.async({ file: join(cwd, ".serverless", "serverless-basic-dev-hello.zip") });
    const js = await zip.entryData("index.js");

    return expect(requireFromString(js.toString("utf8")).hello({ name: "event" })).to.become({
      body: `{
  "message": "Go Serverless v2.0! Your function executed successfully!",
  "input": {
    "name": "event"
  }
}`,
      statusCode: 200,
    });
  });

  it('should package function as esm', async () => {
    const cwd = join(__dirname, "serverless-basic-esm");
    await runServerless(serverlessRoot, {
        cwd,
        command: "package"
    });

    const zip = new StreamZip.async({ file: join(cwd, ".serverless", "serverless-basic-dev-hello.zip") });
    const js = await zip.entryData("index.mjs");

    return expect(importFromStringSync(js.toString("utf8")).hello({ name: "event" })).to.become({
      body: `{
  "message": "Go Serverless v2.0! Your function executed successfully!",
  "input": {
    "name": "event"
  }
}`,
      statusCode: 200,
    });
  });
});
