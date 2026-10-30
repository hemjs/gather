# @hemjs/gather

> A lightweight library for collecting and merging configuration from multiple sources.

Gather reads configuration from a list of providers and merges it, in order, into one object. A provider can be a plain object, a function that returns one, or a module class or instance whose `register` method returns one. Nested objects merge at every depth, arrays are joined, and later providers win. Every error names the provider at fault by its position in the list. Everything is synchronous, and the only dependency, `@armscye/module`, provides types.

## Table of contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [Config providers](#config-providers)
- [Errors](#errors)
- [Merge behavior](#merge-behavior)
- [Upgrading from 1.x](#upgrading-from-1x)
- [License](#license)

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

// With no environment variables set:
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

Order the providers from defaults to overrides: when two providers set the same key, the later one wins.

## Config providers

Each provider must produce a plain object, or nothing (`undefined` or `null`), which is skipped. A plain object is an object literal, an object with a `null` prototype, such as a module namespace (`import * as config from './config.js'`), or an object literal from another realm. A namespace's default export becomes a `default` key, so pass the default export itself (`import config from './config.js'`) when that is where the config is.

In TypeScript, the `ConfigProvider` type catches many invalid providers at compile time: arrays, Promises, Maps and Sets, `async` functions, functions that take arguments, and classes that need constructor arguments, have no `register` method or have an `async` one. Some mistakes are caught only at runtime, such as an instance without a `register` method or a function that returns a class instance.

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

Any object with a `register` method is treated as a module, including a plain object. Only what `register` returns is merged; the object's other keys are ignored. A class, or a class instance, without a `register` method is rejected.

Some classes cannot be told apart from a function, so Gather calls them without `new`, which fails: a bound class (`MyModule.bind(null)`), and a class compiled to ES5 or wrapped in a Proxy whose `register` is an instance field rather than a method. Pass the class itself, or define `register` as a method.

## Errors

Gather's errors extend `GatherError`, which carries the position of the provider in the list as `index`:

| Error                  | Thrown when                                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `InvalidProviderError` | A provider is not a class, function, plain object or module; it is an array or a Promise; a class has no `register` method; or it produces something other than a plain object. |
| `ProviderFailedError`  | A provider throws from its constructor, its `register` method or the function. The thrown value is kept as `cause`.                                                             |

```txt
InvalidProviderError: Invalid config provider at index 1: expected a class, function, plain object or module, got number
InvalidProviderError: Invalid config provider at index 0: expected a plain object as config, got a Promise (async providers are not supported)
ProviderFailedError: Config provider at index 2 threw: Cannot read properties of undefined (reading 'split')
```

A provider's own error is always wrapped, even when it is a `GatherError` from a `Gather` the provider uses itself, so `index` always refers to your list.

Gather expects config objects to be plain data. An error thrown by a getter on a config object, or while reading the list itself (by a generator, or because the list is not iterable), is not wrapped, and a config object that contains itself overflows the stack.

To handle an error from your own code, check `cause`:

```ts
import { Gather, ProviderFailedError } from '@hemjs/gather';
import { ZodError } from 'zod';

let config: Record<string, any>;
try {
  config = new Gather(providers).getMerged();
} catch (error) {
  if (error instanceof ProviderFailedError && error.cause instanceof ZodError) {
    console.error(
      `Invalid config from provider ${error.index}:`,
      error.cause.issues,
    );
    process.exit(1);
  }
  throw error;
}
```

## Merge behavior

Providers are merged in the order they are given, so later providers win. They can be passed as an array or any other iterable, such as a Set or a generator.

Each key is merged by these rules:

- **Plain objects** are merged recursively, at every depth, with the same rules.
- **Arrays** are concatenated onto an existing array, keeping duplicates. An array replaces any value that is not an array.
- **`null` and `undefined`** values are skipped: they never remove or overwrite an existing value.
- **`__proto__` keys** are skipped, so config parsed from JSON cannot replace an object's prototype.
- **Symbol keys** are skipped: only string keys are merged.
- **Anything else**, including strings, numbers, dates, maps and class instances, replaces the existing value.

```ts
const gather = new Gather([
  { foo: 'bar', db: { host: 'localhost', tags: ['a'] } },
  { foo: 'baz', db: { port: 5432, tags: ['b'] } },
]);
const config = gather.getMerged();
// { foo: 'baz', db: { host: 'localhost', port: 5432, tags: ['a', 'b'] } }
```

Merging never changes a provider's objects: objects and arrays that are merged are copied first. The copies are shallow, so values inside them, such as the objects in an array, are shared with the provider. `getMerged()` returns the same object on every call, so copy it before changing it.

### The `merge` function

The same rules are exported as `merge(target, ...sources)`. It merges each source into `target`, left to right, changes `target` in place and returns it. Without a target, it starts from an empty object.

```ts
import { merge } from '@hemjs/gather';

const defaults = { db: { host: 'localhost' }, plugins: ['core'] };
merge(defaults, { db: { port: 5432 } }, { plugins: ['auth'] });
// defaults is now { db: { host: 'localhost', port: 5432 }, plugins: ['core', 'auth'] }
```

## Upgrading from 1.x

Version 2 merges config at every depth and reports invalid providers instead of skipping them. Most applications only need the changes in the first three items.

- **ES modules.** Gather is published as an ES module and requires Node.js 22.12 or later. On those versions, CommonJS code can still `require()` it. Import from `@hemjs/gather` only: files inside the package, such as `dist/`, can no longer be imported directly.
- **Nested objects merge at every depth.** In 1.x, nested objects merged one level deep, so `{ db: { pool: { min: 1 } } }` followed by `{ db: { pool: { max: 5 } } }` lost `min`. Both keys are now kept.
- **Invalid providers throw.** A class or instance without a `register` method, a Promise, and a function or `register` method that returns something other than a plain object, such as an `async` function, now throw `InvalidProviderError`. In 1.x they were skipped, and their config was silently lost.
- **Errors are exported and name the provider.** Errors extend `GatherError` and carry the provider's `index`. An error thrown by a provider is wrapped in `ProviderFailedError`, so code that caught a provider's own error type should check `error.cause`. Code that matched error message text may need updating.
- **Mismatched values replace each other.** An array now replaces a value that is not an array, and an object replaces an array. In 1.x, these cases threw, joined strings, or turned arrays into objects.
- **`__proto__` keys are skipped** instead of replacing the merged object's prototype.
- **Types and dependencies.** `ConfigProvider` is narrower and rejects many invalid providers at compile time, and `ConfigObject` is new. Gather no longer depends on `@hemjs/notions` or `uid`, and now depends on `@armscye/module` for its types.

## License

This project is licensed under the **MIT license**.

See [LICENSE](LICENSE) for more information.
