import { describe, expect, it } from 'vitest';

import {
  GatherError,
  InvalidProviderError,
  ProviderFailedError,
} from '../src/index.js';

describe('errors', () => {
  it.each([
    ['InvalidProviderError', new InvalidProviderError(0, 'reason')],
    ['ProviderFailedError', new ProviderFailedError(0, new Error('reason'))],
  ])('should name %s and extend GatherError', (name, error) => {
    expect(error).toBeInstanceOf(GatherError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe(name);
  });

  it('should keep its name in subclasses and minified builds', () => {
    // A minifier renames classes, so the name must not come from the class.
    const Renamed = class extends InvalidProviderError {};

    expect(new Renamed(0, 'reason').name).toBe('InvalidProviderError');
    expect(new GatherError(0, 'reason').name).toBe('GatherError');
  });

  it('should keep name off the error itself, as built-in errors do', () => {
    const error = new InvalidProviderError(1, 'reason');
    const keys: string[] = [];
    for (const key in error) {
      keys.push(key);
    }

    expect(Object.keys(error)).toEqual(['index']);
    expect(keys).toEqual(['index']);
    expect(JSON.stringify(error)).toBe('{"index":1}');
    expect(
      Object.getOwnPropertyDescriptor(InvalidProviderError.prototype, 'name'),
    ).toMatchObject({ enumerable: false, writable: true, configurable: true });
  });

  it('should load and name errors when Error.prototype is frozen', async () => {
    // Load the module in a fresh realm whose Error.prototype is frozen, as in
    // a hardened environment.
    const { runInNewContext } = await import('node:vm');
    const { readFile } = await import('node:fs/promises');
    const { default: ts } = await import('typescript');
    const source = await readFile(
      new URL('../src/errors.ts', import.meta.url),
      'utf8',
    );
    const { outputText: code } = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2023,
      },
    });
    const realm = { module: { exports: {} as Record<string, unknown> } };

    runInNewContext(
      `Object.freeze(Error.prototype); var exports = module.exports; ${code}`,
      realm,
    );
    const Hardened = realm.module.exports['InvalidProviderError'] as new (
      index: number,
      reason: string,
    ) => Error;

    expect(new Hardened(0, 'reason').name).toBe('InvalidProviderError');
  });

  it('should fall back to the error type when its message is empty', () => {
    expect(new ProviderFailedError(0, new TypeError()).message).toBe(
      'Config provider at index 0 threw: TypeError',
    );
  });

  it('should carry index on every GatherError', () => {
    const errors: GatherError[] = [
      new InvalidProviderError(1, 'reason'),
      new ProviderFailedError(2, new Error('reason')),
    ];

    expect(errors.map((error) => error.index)).toEqual([1, 2]);
  });
});
