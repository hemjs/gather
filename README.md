# @hemjs/gather

> A lightweight library for collecting and seamlessly merging configuration from multiple sources.

## Table of contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [Introduction](#introduction)
- [Features](#features)
- [Config providers](#config-providers)
- [Merge behavior](#merge-behavior)
- [Tips](#tips)

## Installation

Gather is published as an ES module and requires Node.js 22.12 or later.

```sh
npm install @hemjs/gather
```

```sh
pnpm add @hemjs/gather
```

```sh
yarn add @hemjs/gather
```

CommonJS code can still load it with `require()`, which Node.js 22.12 and later support for ES modules.

## Quick start

```ts
import { Gather } from '@hemjs/gather';

const gather = new Gather([
  {
    port: Number(process.env.PORT) || 3000,
  },
  {
    database: {
      host: process.env.DATABASE_HOST || 'localhost',
      port: Number(process.env.DATABASE_PORT) || 5432,
    },
  },
  () => {
    if (process.env.NODE_ENV === 'production') {
      return {
        logLevel: 'warn',
      };
    }
    return {
      logLevel: 'debug',
    };
  },
]);

const config = gather.getMerged();

// Output:
// {
//   port: 3000,
//   database: {
//     host: 'localhost',
//     port: 5432,
//   },
//   logLevel: 'debug'
// }

console.log(config);
```

## Introduction

Gather is a lightweight library that allows you to collect and combine configuration from multiple sources into a single, unified configuration object. It is designed to simplify your project structure and boost maintainability with an intuitive API and intelligent merging behavior.

Using Gather library offers several benefits:

- **Reduced complexity:** Centralizes configuration management, decluttering project structure and improving maintainability.
- **Increased flexibility:** Adapts to various configuration needs based on environments, contexts, or specific requirements.
- **Conflict resolution:** Reliable merging and conflict resolution ensure predictable behavior and consistent settings.

Defining a configuration consists of constructing a `Gather` and merging objects and joining arrays from any number of providers.

## Features

### Flexibility

Gather accomodates various configuration sources, including classes implementing the `Module` interface, plain objects, and functions. You can define your configuration in different modules or components, promoting cleaner structure and easier maintenance.

### Merging power

Gather seamlessly merges configuration from multiple sources, prioritizing them based on the order they're provided.The library uses intelligent logic to handle potentially conflicting settings, ensuring smooth integration and avoiding unexpected behavior.

### Ease of use

Gather offers a straightforward and intuitive API for defining and accessing configuration. The library has minimal external dependencies, keeping your project footprint optimized.

## Config providers

Gather gives you flexibility in defining your configuration by supporting various configuration providers, allowing you to choose the approach that best suits your needs. Each provider must produce a plain JavaScript object, or nothing (`undefined` or `null`), which is skipped.

In TypeScript, the `ConfigProvider` type catches most invalid providers at compile time: arrays, Promises, Maps and Sets, `async` functions, functions that take arguments, and classes that need constructor arguments or have no `register` method.

### Plain objects

Supply configuration directly as an object literal.

```ts
const config = {
  port: 8080,
  theme: 'dark',
};
```

### Functions

Provide a function that returns a configuration object. Gather calls it once, with no arguments.

```ts
const getConfig = () => {
  if (process.env.NODE_ENV === 'production') {
    return {
      logLevel: 'warn',
    };
  }
  return {
    logLevel: 'debug',
  };
};
```

Providers are synchronous: a function that returns a Promise, such as an `async` function, is rejected.

### Module classes

Implement the `Module` interface with a `register` method that returns the configuration object. You can pass either a class or an instance to the Gather constructor. Classes compiled to ES5 or by Babel work too: any function whose prototype has a `register` method is constructed with `new`.

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

Any object with a `register` method is treated as a module, including a plain object. Only what `register` returns is merged; the object's other keys are ignored. A class instance without a `register` method contributes nothing.

### Errors

Gather throws when a provider is not a class, function or object, when it is an array or a Promise, or when it produces something other than a plain object, including a class instance. The message names the position of the provider in the list:

```txt
Invalid config provider at index 1: expected a class, function or object, got number
Invalid config from provider at index 0: expected a plain object, got a Promise (async providers are not supported)
```

An error thrown by a provider itself, from its constructor, its `register` method or the function, is rethrown with the same position. The original error is kept as `cause`:

```txt
Config provider at index 2 threw: Cannot read properties of undefined (reading 'split')
```

## Merge behavior

Providers are merged in the order they are given, so later providers win. The `merge` function, also exported, applies these rules to each key:

- **Plain objects** are merged recursively, at every depth, with the same rules.
- **Arrays** are concatenated onto an existing array, keeping duplicates. An array replaces any value that is not an array.
- **`null` and `undefined`** values are skipped: they never remove or overwrite an existing value.
- **Anything else**, including strings, numbers, dates, maps and class instances, replaces the existing value.

Merging never changes a provider's objects: objects and arrays that are merged are copied first. The copies are shallow, so values inside them, such as the objects in an array, are shared with the provider. `getMerged()` returns the same object on every call, so copy it before changing it.

```ts
const gather = new Gather([
  { foo: 'bar', db: { host: 'localhost', tags: ['a'] } },
  { foo: 'baz', db: { port: 5432, tags: ['b'] } },
]);
const config = gather.getMerged();
// { foo: 'baz', db: { host: 'localhost', port: 5432, tags: ['a', 'b'] } }
```

## Tips

Here are some tips for using the Gather library effectively:

- Categorize your configuration sources and prioritize them in the Gather constructor. This ensures important settings take precedence and avoids unexpected overrides.
- Define complex configuration logic in Module classes for improved code organization and reuse.
- Write unit tests for your Module classes and Gather usage to ensure correct behavior and prevent regressions.
- Use comments within your modules and Gather constructor to explain the purpose and structure of your configurations.

## License

This project is licensed under the **MIT license**.

See [LICENSE](LICENSE) for more information.
