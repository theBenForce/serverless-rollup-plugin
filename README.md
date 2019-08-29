# Welcome to serverless-rollup-plugin 👋

[![Build Status](https://travis-ci.org/drg-adaptive/serverless-rollup-plugin.svg?branch=master)](https://travis-ci.org/drg-adaptive/serverless-rollup-plugin)
[![Maintainability](https://api.codeclimate.com/v1/badges/79e200bf72d884691c7a/maintainability)](https://codeclimate.com/github/drg-adaptive/serverless-rollup-plugin/maintainability)
[![npm version](https://badge.fury.io/js/serverless-rollup-plugin.svg)](https://badge.fury.io/js/serverless-rollup-plugin)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fdrg-adaptive%2Fserverless-rollup-plugin.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Fdrg-adaptive%2Fserverless-rollup-plugin?ref=badge_shield)

> A plugin for the serverless framework to bundle lambda code using rollup

## Install

```sh
yarn install serverless-rollup-plugin
```

## Usage
Add the plugin to your serverless config:
```yaml
plugins:
  - serverless-rollup-plugin
  - ...any other plugins
```

Under the custom property, add a section for rollup. The only required property to run rollup is the `config` property:
```yaml
custom:
    rollup:
      config: ./rollup.config.js
```

## Author

👤 **Ben Force**

* Twitter: [@theBenForce](https://twitter.com/theBenForce)
* Github: [@theBenForce](https://github.com/theBenForce)

## 🤝 Contributing

Contributions, issues and feature requests are welcome!

Feel free to check [issues page](https://github.com/drg-adaptive/serverless-rollup-plugin/issues).

## Show your support

Give a ⭐️ if this project helped you!


***
_This README was generated with ❤️ by [readme-md-generator](https://github.com/kefranabg/readme-md-generator)_