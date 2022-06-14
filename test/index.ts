import { join } from 'node:path';
import { createRequire } from 'node:module';
import { expect } from 'chai';
import StreamZip from 'node-stream-zip';
import { importFromStringSync, requireFromString } from 'module-from-string';
import logEmitter from 'log/lib/emitter.js';
import runServerless from '@serverless/test/run-serverless.js';

const require = createRequire(import.meta.url);
const serverlessRoot = join(require.resolve('serverless'), '..', '..');

const logsBuffer = [];
logEmitter.on('log', (event) => {
  const { logger: { namespace }, messageTokens } = event;
  if (
    namespace === 'serverless:plugin:serverless-rollup-plugin'
    || namespace.endsWith('dist') // this is when loading the plugin from a type: commonjs environment
  ) {
    logsBuffer.push(messageTokens[0]);
  }
});

describe('general', () => {
  beforeEach(() => {
    logsBuffer.splice(0, logsBuffer.length);
  });

  it('should package function as cjs', async () => {
    const cwd = new URL('fixtures/serverless-basic', import.meta.url).pathname;
    await runServerless(serverlessRoot, {
      cwd,
      command: 'package',
    });

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
    await runServerless(serverlessRoot, {
      cwd,
      command: 'package',
    });

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
    await runServerless(serverlessRoot, {
      cwd,
      command: 'package',
    });

    expect(logsBuffer.some((message) => message.startsWith('Please switch to using \'mjs\' extension'))).to.be.true();
    expect(logsBuffer.some((message) => message.endsWith('Will load using commonjs transpilation.'))).to.be.true();

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
    await runServerless(serverlessRoot, {
      cwd,
      command: 'package',
    });

    expect(logsBuffer.filter((message) => message.startsWith('Bundling '))).to.have.lengthOf(1);
    expect(logsBuffer.filter((message) => message.startsWith('multiple-functions-per-file-dev-hello: Outputting bundle '))).to.have.lengthOf(1);
    expect(logsBuffer.filter((message) => message.startsWith('multiple-functions-per-file-dev-world: Outputting bundle '))).to.have.lengthOf(1);

    console.log(logsBuffer);
    const [hello, world] = await Promise.all([
      await new StreamZip.async({ // eslint-disable-line new-cap
        file: join(cwd, '.serverless', 'multiple-functions-per-file-dev-hello.zip'),
      }).entryData('index.js'),
      await new StreamZip.async({ // eslint-disable-line new-cap
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
    await runServerless(serverlessRoot, {
      cwd,
      command: 'package',
    });

    expect(logsBuffer.filter((message) => message.startsWith('Bundling '))).to.have.lengthOf(2);
    expect(logsBuffer.filter((message) => message.startsWith('multiple-files-dev-hello: Outputting bundle '))).to.have.lengthOf(1);
    expect(logsBuffer.filter((message) => message.startsWith('multiple-files-dev-world: Outputting bundle '))).to.have.lengthOf(1);

    const [hello, world] = await Promise.all([
      await new StreamZip.async({ // eslint-disable-line new-cap
        file: join(cwd, '.serverless', 'multiple-files-dev-hello.zip'),
      }).entryData('index.js'),
      await new StreamZip.async({ // eslint-disable-line new-cap
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
});
