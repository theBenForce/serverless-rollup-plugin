import { join } from 'node:path';
import { expect } from 'chai';
import StreamZip from 'node-stream-zip';
import { execa } from 'execa';
import { importFromStringSync, requireFromString } from 'module-from-string';

const runServerless = (cwd: string) => execa({ preferLocal: true, cwd, lines: true })`sls package --verbose --stage testing`;

describe('general', () => {
  it('should package function as cjs', async () => {
    const cwd = new URL('fixtures/serverless-basic', import.meta.url).pathname;
    await runServerless(cwd);

    const zip = new StreamZip.async({ // eslint-disable-line new-cap
      file: join(cwd, '.serverless', 'serverless-basic-dev-hello.zip'),
    });
    const js = await zip.entryData('index.js');

    return expect(requireFromString(js.toString('utf8')).hello({ name: 'event' })).to.become({
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
    const cwd = new URL('fixtures/serverless-basic-esm', import.meta.url).pathname;
    await runServerless(cwd);

    const zip = new StreamZip.async({ // eslint-disable-line new-cap
      file: join(cwd, '.serverless', 'serverless-basic-dev-hello.zip'),
    });
    const js = await zip.entryData('index.mjs');

    return expect(importFromStringSync(js.toString('utf8')).hello({ name: 'event' })).to.become({
      body: `{
  "message": "Go Serverless v2.0! Your function executed successfully!",
  "input": {
    "name": "event"
  }
}`,
      statusCode: 200,
    });
  });

  it('should transpile rollup.config.js to commonjs if required', async () => {
    const cwd = new URL('fixtures/rollup-transpile-commonjs', import.meta.url).pathname;
    const { stderr } = await runServerless(cwd);

    expect(stderr.some((message) => message.includes('Please switch to using \'mjs\' extension'))).to.be.true();
    expect(stderr.some((message) => message.endsWith('Will load using commonjs transpilation.'))).to.be.true();

    const zip = new StreamZip.async({ // eslint-disable-line new-cap
      file: join(cwd, '.serverless', 'serverless-basic-dev-hello.zip'),
    });
    const js = await zip.entryData('index.mjs');

    return expect(importFromStringSync(js.toString('utf8')).hello({ name: 'event' })).to.become({
      body: `{
  "message": "Go Serverless v2.0! Your function executed successfully!",
  "input": {
    "name": "event"
  }
}`,
      statusCode: 200,
    });
  });

  it('should reuse rollup bundle when bundling multiple functions in one file', async () => {
    const cwd = new URL('fixtures/multiple-functions-per-file', import.meta.url).pathname;
    const { stderr } = await runServerless(cwd);

    expect(stderr.filter((message) => message.startsWith('Bundling '))).to.have.lengthOf(1);
    expect(stderr.filter((message) => message.startsWith('multiple-functions-per-file-dev-hello: Outputting bundle '))).to.have.lengthOf(1);
    expect(stderr.filter((message) => message.startsWith('multiple-functions-per-file-dev-world: Outputting bundle '))).to.have.lengthOf(1);

    const [hello, world] = await Promise.all([
      new StreamZip.async({ // eslint-disable-line new-cap
        file: join(cwd, '.serverless', 'multiple-functions-per-file-dev-hello.zip'),
      }).entryData('index.js'),
      new StreamZip.async({ // eslint-disable-line new-cap
        file: join(cwd, '.serverless', 'multiple-functions-per-file-dev-world.zip'),
      }).entryData('index.js'),
    ]);

    return Promise.all([
      expect(requireFromString(hello.toString('utf8')).hello()).to.become({
        body: `{
  "message": "Hello"
}`,
        statusCode: 200,
      }),
      expect(requireFromString(world.toString('utf8')).world()).to.become({
        body: `{
  "message": "World"
}`,
        statusCode: 200,
      }),
    ]);
  });

  it('should bundle functions from multiple files', async () => {
    const cwd = new URL('fixtures/multiple-files', import.meta.url).pathname;
    const { stderr } = await runServerless(cwd);

    expect(stderr.filter((message) => message.startsWith('Bundling '))).to.have.lengthOf(2);
    expect(stderr.filter((message) => message.startsWith('multiple-files-dev-hello: Outputting bundle '))).to.have.lengthOf(1);
    expect(stderr.filter((message) => message.startsWith('multiple-files-dev-world: Outputting bundle '))).to.have.lengthOf(1);

    const [hello, world] = await Promise.all([
      new StreamZip.async({ // eslint-disable-line new-cap
        file: join(cwd, '.serverless', 'multiple-files-dev-hello.zip'),
      }).entryData('index.js'),
      new StreamZip.async({ // eslint-disable-line new-cap
        file: join(cwd, '.serverless', 'multiple-files-dev-world.zip'),
      }).entryData('index.js'),
    ]);

    return Promise.all([
      expect(requireFromString(hello.toString('utf8')).handle()).to.become({
        body: `{
  "message": "Hello"
}`,
        statusCode: 200,
      }),
      expect(requireFromString(world.toString('utf8')).handle()).to.become({
        body: `{
  "message": "World"
}`,
        statusCode: 200,
      }),
    ]);
  });

  it('should default to using rollup.config.js', async () => {
    const cwd = new URL('fixtures/default-config', import.meta.url).pathname;
    await runServerless(cwd);

    const zip = new StreamZip.async({ // eslint-disable-line new-cap
      file: join(cwd, '.serverless', 'default-config-dev-hello.zip'),
    });
    const js = await zip.entryData('index.js');

    return expect(requireFromString(js.toString('utf8')).hello()).to.become({
      body: 'default-config',
      statusCode: 200,
    });
  });
});
