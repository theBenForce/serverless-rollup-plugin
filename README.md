# Welcome to serverless-rollup-plugin 👋

[![Release](https://github.com/theBenForce/serverless-rollup-plugin/workflows/Release/badge.svg)](https://github.com/theBenForce/serverless-rollup-plugin/actions)
[![Maintainability](https://api.codeclimate.com/v1/badges/79e200bf72d884691c7a/maintainability)](https://codeclimate.com/github/theBenForce/serverless-rollup-plugin/maintainability)
[![npm version](https://badge.fury.io/js/serverless-rollup-plugin.svg)](https://badge.fury.io/js/serverless-rollup-plugin)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FtheBenForce%2Fserverless-rollup-plugin.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2FtheBenForce%2Fserverless-rollup-plugin?ref=badge_shield)
[![All Contributors](https://img.shields.io/github/all-contributors/theBenForce/serverless-rollup-plugin?color=ee8449&style=flat-square)](#contributors)

> A plugin for the serverless framework to bundle lambda code using rollup

## Install

```sh
npm install --save-dev serverless-rollup-plugin
```

Requires Node.js 18 and serverless 3.2.

## Usage

Add the plugin to your serverless config:

```yaml
plugins:
  - serverless-rollup-plugin
  - ...any other plugins
```

For each function that you would like to use rollup option, just define the handler option as normal. You can
optionally define the `dependencies` property as a list of packages to be installed in the `node_modules` folder
in your lambda.

```yaml
testFunction:
  handler: src/functions/testFunction/index.handler
  dependencies:
    - aws-xray-sdk-core
  copyFiles:
    - some/glob/**/*.pattern
```

### Config

By default, `serverless-rollup-plugin` will attempt to load `rollup.config.js`.
In order to override this behavior, you can add the following to configuration options:

```yaml
custom:
  rollup:
    config: ./custom-rollup.config.js
```

### Using Yarn

By default if you specify function dependencies `npm` will be used. You can override this by setting the `installCommand` property, like this:

```yaml
custom:
  rollup:
    installCommand: yarn add
```

### Add Global Dependency

If you want to add a dependency for every lambda function (for example [adding source map support](#adding-sourcemap-support)), you can add them to the rollup `dependencies` property:

```yaml
custom:
  rollup:
    dependencies:
      - some-package-name
```

### Output Options

If you don't specify `output` settings in your rollup config, the following defaults will be used:

```json
{
  "format": "cjs",
  "sourcemap": true
}
```

If the `format` is `esm`, the resulting package will use the `mjs` extension to make use of [native lambda esm support](https://aws.amazon.com/blogs/compute/using-node-js-es-modules-and-top-level-await-in-aws-lambda/).

### Concurrency

By default, `serverless-rollup-plugin` will output rollup bundles concurrently.
In systems with low memory, such as small CI instances, it may be necessary to limit the number concurrent outputs so as not to run out of memory.
You can define the number of concurrent outputs by using the `concurrency` option:

```yaml
custom:
  rollup:
    concurrency: 3
```

Any value other than a number will be treated as `Number.POSITIVE_INFINITY`.

### Adding Sourcemap Support

You can easily get your lambda stack traces to show correct file/line information using the `source-map-support` package.
To use this with the `serverless-rollup-plugin`, first install the package and add it to the universal dependencies:

```yaml
custom:
  rollup:
    dependencies:
      - source-map-support
```

Then in your rollup config, set the output banner to install it:

```typescript
export default {
  output: {
    format: "cjs",
    sourcemap: true,
    banner: "require('source-map-support').install();"
  }
};
```

If you do specify `output` settings, they will be used and only the `file` property will be overwritten.

### Copying Resource Files

To copy a static file into your function deployment, use the `copyFiles` parameter. This
parameter is an array of glob pattern strings, or objects with the following properties:

| Name        | Required | Description                                                     |
| ----------- | -------- | --------------------------------------------------------------- |
| glob        | Yes      | A glob pattern                                                  |
| srcBase     | No       | Part of the path that will be removed from the destination path |
| destination | No       | Destination path within the lambda's directory structure        |

## 🧑‍💻 Contributors

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

## 🤝 Contributing

Contributions, issues and feature requests are welcome!

Feel free to check [issues page](https://github.com/drg-adaptive/serverless-rollup-plugin/issues).

## Show your support

Give a ⭐️ if this project helped you!

---

_This README was generated with ❤️ by [readme-md-generator](https://github.com/kefranabg/readme-md-generator)_
