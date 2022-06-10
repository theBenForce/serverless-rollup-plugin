import { join } from "path";
import { expect } from "chai";
import StreamZip from "node-stream-zip";
import { requireFromString } from 'module-from-string';
import runServerless from "@serverless/test/run-serverless";

describe('Some suite', () => {
  it('Some test that involves creation of serverless instance', async () => {
    const cwd = join(__dirname, "serverless-basic");
    await runServerless(join(require.resolve("serverless"), "..", ".."), {
        cwd,
        command: "package"
    });

    const zip = new StreamZip.async({ file: join(cwd, ".serverless", "aws-node-project-dev-hello.zip") });
    const js = await zip.entryData("index.js");

    return expect(requireFromString(js.toString("utf8")).hello()).to.become({
      body: "{\n  \"message\": \"Go Serverless v2.0! Your function executed successfully!\"\n}",
      statusCode: 200,
    })
  });
});
