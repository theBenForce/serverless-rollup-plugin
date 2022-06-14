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
  if (event.logger.namespace.endsWith('dist')) {
    logsBuffer.push(event.messageTokens[0]);
  }
});

describe('general', () => {
  before(() => {
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
});
