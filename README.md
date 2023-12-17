# @hemjs/gather

> A lightweight library for collecting and merging configuration from multiple sources.

First add the dependency to your project:

Using npm:

```sh
npm install --save @hemjs/gather
```

or using yarn:

```sh
yarn add @hemjs/gather
```

Then instantiate `Gather` passing "config providers" to its constructor:

```ts
import { Gather } from '@hemjs/gather';

const gather = new Gather([{ bar: 'bat' }, { foo: ['bar'] }]);
const config = gather.getMerged(); // { bar: 'bat', foo: ['bar'] }
```

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Config Providers](#config-providers)

## Overview

Gather is a lightweight library that allows you to collect and combine configuration from multiple sources into a single object. It is designed to simplify configuration management in your projects, offering the following benefits:

- Reduced Complexity: Centralizes configuration management, decluttering project structure and improving maintainability.
- Increased Flexibility: Adapts to various configuration needs based on environments, contexts, or specific requirements.
- Enhanced Confidence: Reliable merging and conflict resolution ensure predictable behavior and consistent settings.

## Features

### Flexibility

Gather accomodates various configuration sources, including classes implementing the `Module` interface, plain objects, and functions. You can define your configuration in different modules or components, promoting cleaner structure and easier maintenance.

### Merging Power

Gather seamlessly merges configuration from multiple sources, prioritizing them based on the order they're provided.The library uses intelligent logic to handle potentially conflicting settings, ensuring smooth integration and avoiding unexpected behavior.

### Ease of Use

Gather offers a straightforward and intuitive API for defining and accessing configuration. The library has minimal external dependencies, keeping your project footprint optimized.

## Config Providers

Gather gives you flexibility in defining your configuration by supporting various configuration providers, allowing you to choose the approach that best suits your needs. Each provider should return a plain JavaScript object to be merged.

### Plain Objects

Supply configuration directly as an object literal.

```ts
const config = {
  port: 8080,
  theme: 'dark',
};
```

### Functions

Provide configuration directly as a function returning an object.

```ts
const getConfig = (env) => {
  if (env === 'production') {
    return {
      logLevel: 'warn',
    };
  }
  return {
    logLevel: 'debug',
  };
};
```

### Module Classes

Implement the `Module` interface with a `register` method that returns the configuration object.

```ts
import type { Module } from '@armscye/module';

class MyModule implements Module {
  register() {
    return {
      foo: 'bar',
      baz: { qux: true },
    };
  }
}
```

## License

This project is licensed under the **MIT license**.

See [LICENSE](LICENSE) for more information.
