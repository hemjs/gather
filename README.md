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

Install with npm:

```sh
npm install --save @hemjs/gather
```

Install with yarn:

```sh
yarn add @hemjs/gather
```

## Quick start

```ts
import { Gather } from '@hemjs/gather';

const gather = new Gather([
  {
    port: parseInt(process.env.PORT, 10) || 3000,
  },
  {
    database: {
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    },
  },
  () => {
    if (process.env.NODE_ENV === 'production') {
      return {
        logLevel: 'warning',
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

Gather gives you flexibility in defining your configuration by supporting various configuration providers, allowing you to choose the approach that best suits your needs. Each provider should return a plain JavaScript object to be merged.

### Plain objects

Supply configuration directly as an object literal.

```ts
const config = {
  port: 8080,
  theme: 'dark',
};
```

### Functions

Provide a function that returns a configuration object.

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

### Module classes

Implement the `Module` interface with a `register` method that returns the configuration object. You can pass either a class or an instance to the Gather constructor.

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

Gather throws errors for invalid providers or during merging inconsistencies. Check the console for helpful error messages.

## Merge behavior

The `merge` function in the Gather library handles objects and arrays in a specific way to combine configurations from different sources effectively. Here's a breakdown:

### Objects:

1. By default, objects are merged using a "shallow merge". This means that values from the source object directly overwrite existing values in the target object with the same key.
2. If both the target and source objects have the same key with nested objects, those nested objects are further merged recursively using the same shallow merge approach.
3. If a key in the source object is null, it effectively removes the corresponding key from the target object (essentially overriding it with null)

```ts
const gather = new Gather([{ foo: 'bar' }, { bar: 'baz' }, { bar: 'bat' }]);
const config = gather.getMerged(); // { foo: 'bar', bar: 'bat' }
```

### Arrays:

1. Gather combines arrays by adding the elements of the source array to the end of the target array, keeping duplicates.
2. If the target value for a key is null or undefined, the source array entirely replaces it with the concatenated source array.

```ts
const gather = new Gather([{ foo: 'bar' }, { bar: ['baz'] }, { bar: ['bat'] }]);
const config = gather.getMerged(); // { foo: 'bar', bar: ['baz', 'bat'] }
```

You can customize the default merge behavior by extending the Gather class and overriding the `merge` method. This allows you to implement custom logic for handling specific data types or conflict resolution strategies.

## Tips

Here are some tips for using the Gather library effectively:

- Categorize your configuration sources and prioritize them in the Gather constructor. This ensures important settings take precedence and avoids unexpected overrides.
- Define complex configuration logic in Module classes for improved code organization and reuse.
- The `merge` function allows customizing how objects are merged. Consider using deep merging for object properties to avoid data loss.
- Write unit tests for your Module classes and Gather usage to ensure correct behavior and prevent regressions.
- Use comments within your modules and Gather constructor to explain the purpose and structure of your configurations.

## License

This project is licensed under the **MIT license**.

See [LICENSE](LICENSE) for more information.
