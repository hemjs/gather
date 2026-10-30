import { InvalidProviderError, ProviderFailedError } from './errors.js';
import { merge } from './merge.js';
import type { ConfigProvider } from './types.js';
import {
  isClass,
  isConfigObject,
  isModule,
  isPlainObject,
  isThenable,
} from './utils.js';

/**
 * Collects config from providers and merges it, in order, into one object.
 */
export class Gather {
  private readonly config: Record<string, any> = {};

  /**
   * Read every provider and merge its config, in order.
   * @param providers the config providers, as an array or another iterable;
   *   later providers win
   * @throws {InvalidProviderError} if a provider, or its config, is invalid.
   * @throws {ProviderFailedError} if a provider throws.
   */
  constructor(providers: Iterable<ConfigProvider> = []) {
    let index = 0;
    for (const provider of providers) {
      merge(this.config, read(provider, index++));
    }
  }

  /** Returns the merged config; every call returns the same object. */
  getMerged(): Record<string, any> {
    return this.config;
  }
}

function read(provider: unknown, index: number): object | undefined {
  if (typeof provider === 'function') {
    if (!isClass(provider)) {
      return check(run(provider as () => unknown, index), index);
    }
    const instance = run(() => new (provider as new () => unknown)(), index);
    if (!isModule(instance)) {
      const name = provider.name || '(anonymous)';
      throw reject(
        instance,
        index,
        `expected class ${name} to have a register() method`,
      );
    }
    provider = instance;
  }
  if (isModule(provider)) {
    return check(
      run(() => provider.register(), index),
      index,
    );
  }
  if (isConfigObject(provider)) {
    return provider;
  }
  const hint = Array.isArray(provider)
    ? '; pass its items as separate providers'
    : '';
  throw reject(
    provider,
    index,
    'expected a class, function, plain object or module',
    hint,
  );
}

function check(config: unknown, index: number): object | undefined {
  if (config == null) {
    return undefined;
  }
  if (isConfigObject(config)) {
    return config;
  }
  throw reject(config, index, 'expected a plain object as config');
}

function run<T>(fn: () => T, index: number): T {
  try {
    return fn();
  } catch (error) {
    throw new ProviderFailedError(index, error);
  }
}

function reject(
  value: unknown,
  index: number,
  expected: string,
  hint = '',
): InvalidProviderError {
  // Handle a rejected Promise so it cannot crash the process.
  try {
    void Promise.prototype.then.call(value, undefined, () => {});
  } catch {
    // Not a native Promise.
  }
  return new InvalidProviderError(
    index,
    `${expected}, got ${describe(value)}${hint}`,
  );
}

function describe(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (typeof value !== 'object') {
    return typeof value;
  }
  if (isThenable(value)) {
    return 'a Promise (async providers are not supported)';
  }
  if (Array.isArray(value)) {
    return 'an array';
  }
  if (isPlainObject(value)) {
    return 'a plain object';
  }
  const name = (value.constructor as { name?: string } | undefined)?.name;
  return name && name !== 'Object'
    ? `an instance of ${name}`
    : 'an object with a custom prototype';
}
