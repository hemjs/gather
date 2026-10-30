import { runInNewContext } from 'node:vm';

import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  isClass,
  isConfigObject,
  isModule,
  isPlainObject,
  isThenable,
} from '../src/utils.js';
import * as settings from './fixtures/settings.js';

class Config {
  port = 3000;
}

describe('isPlainObject', () => {
  it.each([
    ['an empty object literal', {}],
    ['an object literal', { port: 3000, db: { host: 'localhost' } }],
    ['an object with a null prototype', Object.create(null) as object],
    [
      'an object created from Object.prototype',
      Object.create(Object.prototype) as object,
    ],
    ['parsed JSON', JSON.parse('{"port":3000}') as object],
    ['a structured clone', structuredClone({ port: 3000 })],
    ['a module namespace', settings],
    ['a frozen object', Object.freeze({ port: 3000 })],
    ['an object with Symbol.toStringTag', { [Symbol.toStringTag]: 'Config' }],
    ['a Proxy of an object literal', new Proxy({ port: 3000 }, {})],
    [
      'an object literal from another realm',
      runInNewContext('({ port: 3000 })') as object,
    ],
    [
      'an object with a null prototype from another realm',
      runInNewContext('Object.create(null)') as object,
    ],
  ])('should accept %s', (_, value) => {
    expect(isPlainObject(value)).toBe(true);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'config'],
    ['a number', 3000],
    ['a boolean', true],
    ['a symbol', Symbol('config')],
    ['a bigint', 1n],
    ['a function', () => ({})],
    ['a class', Config],
    ['an array', [{ port: 3000 }]],
    ['an array from another realm', runInNewContext('[]') as unknown],
    ['a class instance', new Config()],
    ['a Date', new Date()],
    ['a Map', new Map()],
    ['a Set', new Set()],
    ['a RegExp', /config/],
    ['a Promise', Promise.resolve({})],
    ['an Error', new Error('config')],
    ['a boxed primitive', Object('config') as object],
    ['a typed array', new Uint8Array(1)],
    [
      'an object that inherits from an object literal',
      Object.create({ port: 3000 }) as object,
    ],
    [
      'an object that inherits from a null-prototype object',
      Object.create(Object.create(null)) as object,
    ],
    [
      'an object whose prototype defines its own hasOwnProperty',
      Object.create({ hasOwnProperty: () => true }) as object,
    ],
    [
      'a class instance from another realm',
      runInNewContext('new (class Config {})()') as unknown,
    ],
  ])('should reject %s', (_, value) => {
    expect(isPlainObject(value)).toBe(false);
  });

  it('should narrow the type to a record', () => {
    const value: unknown = { port: 3000 };

    if (isPlainObject(value)) {
      expectTypeOf(value).toEqualTypeOf<Record<string, any>>();
    }
  });
});

describe('isThenable', () => {
  it.each([
    ['a Promise', Promise.resolve()],
    [
      'a Promise from another realm',
      runInNewContext('Promise.resolve()') as unknown,
    ],
    ['an object with a then() method', { then() {} }],
    [
      'a class instance with a then() method',
      new (class {
        then() {}
      })(),
    ],
  ])('should accept %s', (_, value) => {
    expect(isThenable(value)).toBe(true);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a number', 1],
    ['an object without then', { port: 3000 }],
    ['an object whose then is not a function', { then: true }],
    ['a function', () => {}],
  ])('should reject %s', (_, value) => {
    expect(isThenable(value)).toBe(false);
  });
});

describe('isClass', () => {
  class Module {
    register() {
      return {};
    }
  }
  class FieldModule {
    register = () => ({});
  }
  // What TypeScript emits for a module class when targeting ES5.
  function Es5Module() {}
  Es5Module.prototype.register = function () {
    return {};
  };

  it.each([
    ['a class', Module],
    ['a class without register()', Config],
    ['a class whose register is a field', FieldModule],
    // `new Function` keeps the test transpiler from reformatting the class.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    ['a minified class', (new Function('return class{}') as () => object)()],
    ['a frozen class', Object.freeze(class Frozen {})],
    ['a module class compiled to ES5', Es5Module],
    ['a Proxy of a module class', new Proxy(Module, {})],
  ])('should accept %s', (_, fn) => {
    expect(isClass(fn)).toBe(true);
  });

  it.each([
    ['an arrow function', () => ({})],
    ['a function', function provider() {}],
    ['a frozen function', Object.freeze(function provider() {})],
    [
      'an async function',
      async () => {
        await Promise.resolve();
      },
    ],
    ['a method', { method(this: void) {} }.method],
    ['a method named class', { class(this: void) {} }.class],
    [
      'a method named class written with a space',
      // `new Function` keeps the test transpiler from reformatting the method.
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      (new Function('return { class () {} }') as () => { class: object })()
        .class,
    ],
    ['a bound class', Module.bind(null)],
    [
      'a Proxy of a class whose register is a field',
      new Proxy(FieldModule, {}),
    ],
  ])('should reject %s', (_, fn) => {
    expect(isClass(fn)).toBe(false);
  });
});

describe('isModule', () => {
  it.each([
    [
      'a module instance',
      new (class {
        register() {}
      })(),
    ],
    ['a plain object with register()', { register: () => ({}) }],
    [
      'an instance whose register is a field',
      new (class {
        register = () => ({});
      })(),
    ],
  ])('should accept %s', (_, value) => {
    expect(isModule(value)).toBe(true);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a plain object', { port: 3000 }],
    ['an object whose register is not a function', { register: true }],
    ['a class instance without register()', new Config()],
    [
      'a module class itself',
      class {
        register() {}
      },
    ],
  ])('should reject %s', (_, value) => {
    expect(isModule(value)).toBe(false);
  });
});

describe('isConfigObject', () => {
  it.each([
    ['an object literal', { port: 3000 }],
    ['an object with a null prototype', Object.create(null) as object],
    ['a module namespace', settings],
  ])('should accept %s', (_, value) => {
    expect(isConfigObject(value)).toBe(true);
  });

  it.each([
    ['a plain object with then()', { then() {}, port: 3000 }],
    ['a Promise', Promise.resolve({})],
    ['an array', [{ port: 3000 }]],
    ['a class instance', new Config()],
    ['null', null],
  ])('should reject %s', (_, value) => {
    expect(isConfigObject(value)).toBe(false);
  });
});
