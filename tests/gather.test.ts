import { runInNewContext } from 'node:vm';

import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  type ConfigProvider,
  Gather,
  InvalidProviderError,
  ProviderFailedError,
} from '../src/index.js';
import { BarProvider } from './fixtures/bar.provider.js';
import { FooProvider } from './fixtures/foo.provider.js';
import { NoopProvider } from './fixtures/noop.provider.js';
import * as settings from './fixtures/settings.js';

/** Run fn and return what it threw. */
function thrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error('expected fn to throw');
}

/** Providers the type rejects, for testing what Gather does at runtime. */
function untyped(...providers: unknown[]): ConfigProvider[] {
  return providers as ConfigProvider[];
}

describe('Gather', () => {
  describe('providers', () => {
    it('should return an empty config when there are no providers', () => {
      expect(new Gather().getMerged()).toEqual({});
      expect(new Gather([]).getMerged()).toEqual({});
    });

    it('should merge object providers', () => {
      const gather = new Gather([
        { bar: 'bat' },
        { foo: ['bar'] },
        { baz: 'baz' },
      ]);

      expect(gather.getMerged()).toEqual({
        bar: 'bat',
        foo: ['bar'],
        baz: 'baz',
      });
    });

    it('should merge module namespaces and objects with a null prototype', () => {
      const bare = Object.assign(Object.create(null) as object, { extra: 1 });
      const gather = new Gather([
        settings,
        { db: { port: 5432 } },
        bare,
        { nested: settings },
        { nested: { more: true } },
      ]);

      expect(gather.getMerged()).toEqual({
        port: 3000,
        db: { host: 'localhost', port: 5432 },
        extra: 1,
        nested: { port: 3000, db: { host: 'localhost' }, more: true },
      });
    });

    it('should read module and function providers from another realm', () => {
      const providers = runInNewContext(`[
        class { register() { return { method: true }; } },
        class { register = () => ({ field: true }); },
        new (class { register() { return { instance: true }; } })(),
        () => ({ fn: true }),
      ]`) as ConfigProvider[];

      expect(new Gather(providers).getMerged()).toEqual({
        method: true,
        field: true,
        instance: true,
        fn: true,
      });
    });

    it('should call a method named class written with a space', () => {
      // `new Function` keeps the test transpiler from reformatting the method.
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const createMethods = new Function(
        'return { class () { return { spaced: true } } }',
      ) as () => { class: ConfigProvider };

      expect(new Gather([createMethods().class]).getMerged()).toEqual({
        spaced: true,
      });
    });

    it('should merge object literals from another realm', () => {
      const foreign = runInNewContext('({ db: { host: "a" }, list: [1] })') as {
        db: object;
      };
      const gather = new Gather([foreign, { db: { port: 1 }, list: [2] }]);

      expect(gather.getMerged()).toEqual({
        db: { host: 'a', port: 1 },
        list: [1, 2],
      });
    });

    it('should call function providers with no arguments', () => {
      const args: unknown[][] = [];
      const gather = new Gather([
        (...rest: unknown[]) => {
          args.push(rest);
          return { baz: 'baz' };
        },
      ]);

      expect(gather.getMerged()).toEqual({ baz: 'baz' });
      expect(args).toEqual([[]]);
    });

    it('should call plain functions and methods', () => {
      function provider() {
        return { foo: 'bar' };
      }
      const methods = {
        class(this: void) {
          return { method: true };
        },
      };

      expect(new Gather([provider, methods.class]).getMerged()).toEqual({
        foo: 'bar',
        method: true,
      });
    });

    it('should instantiate module classes', () => {
      const gather = new Gather([BarProvider, FooProvider]);

      expect(gather.getMerged()).toEqual({ bar: 'bat', foo: ['bar'] });
    });

    it('should read module instances', () => {
      const gather = new Gather([new BarProvider(), new FooProvider()]);

      expect(gather.getMerged()).toEqual({ bar: 'bat', foo: ['bar'] });
    });

    it('should treat an object with a register function as a module', () => {
      const gather = new Gather([{ register: () => ({ foo: 'bar' }), baz: 1 }]);

      expect(gather.getMerged()).toEqual({ foo: 'bar' });
    });

    it('should instantiate classes whose register is a field', () => {
      class FieldModule {
        register = () => ({ field: true });
      }

      expect(new Gather([FieldModule]).getMerged()).toEqual({ field: true });
      // A documented limitation: the Proxy hides the class syntax and the
      // prototype has no register method, so the class is called and fails.
      expect(() => new Gather([new Proxy(FieldModule, {})])).toThrow(
        ProviderFailedError,
      );
    });

    it('should read frozen functions and classes', () => {
      function provider() {
        return { fn: true };
      }

      expect(
        new Gather([
          Object.freeze(provider),
          Object.freeze(BarProvider),
        ]).getMerged(),
      ).toEqual({ fn: true, bar: 'bat' });
    });

    it('should instantiate minified, transpiled and proxied module classes', () => {
      // `new Function` keeps the test transpiler from reformatting the class.
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const createMinified = new Function(
        'return class{register(){return {minified: true}}}',
      ) as () => ConfigProvider;

      // What TypeScript emits for a class when targeting ES5.
      function Es5Module(this: { prefix: string }) {
        this.prefix = 'es5';
      }
      Es5Module.prototype.register = function (this: { prefix: string }) {
        return { es5: this.prefix };
      };

      // What Babel emits: calling the class without `new` throws.
      function BabelModule(this: unknown) {
        if (!(this instanceof BabelModule)) {
          throw new TypeError('Cannot call a class as a function');
        }
      }
      BabelModule.prototype.register = () => ({ babel: true });

      const gather = new Gather([
        createMinified(),
        ...untyped(Es5Module, BabelModule),
        new Proxy(BarProvider, {}),
      ]);

      expect(gather.getMerged()).toEqual({
        minified: true,
        es5: 'es5',
        babel: true,
        bar: 'bat',
      });
    });

    it('should merge providers of every kind, in order', () => {
      const gather = new Gather([
        new BarProvider(),
        FooProvider,
        () => ({ baz: 'baz' }),
        { baz: 'qux', foo: ['baz'] },
      ]);

      expect(gather.getMerged()).toEqual({
        bar: 'bat',
        foo: ['bar', 'baz'],
        baz: 'qux',
      });
    });

    it('should skip providers that produce nothing', () => {
      const gather = new Gather([
        () => undefined,
        () => null,
        { register: () => undefined },
        BarProvider,
      ]);

      expect(gather.getMerged()).toEqual({ bar: 'bat' });
    });

    it('should accept readonly arrays, Sets and generators', () => {
      const list: readonly ConfigProvider[] = [BarProvider];
      function* modules(): Generator<ConfigProvider> {
        yield BarProvider;
        yield FooProvider;
      }

      expect(new Gather(list).getMerged()).toEqual({ bar: 'bat' });
      expect(new Gather(new Set([BarProvider])).getMerged()).toEqual({
        bar: 'bat',
      });
      expect(new Gather(modules()).getMerged()).toEqual({
        bar: 'bat',
        foo: ['bar'],
      });
    });

    it('should keep duplicates when providers repeat', () => {
      expect(new Gather([FooProvider, FooProvider]).getMerged()).toEqual({
        foo: ['bar', 'bar'],
      });
    });

    it('should return the same object on every call', () => {
      const gather = new Gather([BarProvider]);

      expect(gather.getMerged()).toBe(gather.getMerged());
    });
  });

  describe('invalid providers', () => {
    const expected = 'expected a class, function, plain object or module';

    it.each([
      ['a string', 'invalid', 'string'],
      ['a number', 42, 'number'],
      ['null', null, 'null'],
      ['undefined', undefined, 'undefined'],
      [
        'an array',
        [{ foo: 'bar' }],
        'an array; pass its items as separate providers',
      ],
      [
        'a Promise',
        Promise.resolve({}),
        'a Promise (async providers are not supported)',
      ],
      ['a Map', new Map(), 'an instance of Map'],
      [
        'a plain object with then()',
        { then() {}, port: 1 },
        'a Promise (async providers are not supported)',
      ],
      [
        'an instance without register()',
        new NoopProvider(),
        'an instance of NoopProvider',
      ],
    ])('should reject %s with its position', (_, provider, description) => {
      const error = thrown(() => new Gather(untyped({}, provider)));

      expect(error).toBeInstanceOf(InvalidProviderError);
      expect(error).toMatchObject({
        index: 1,
        message: `Invalid config provider at index 1: ${expected}, got ${description}`,
      });
    });

    it.each([
      [
        'a Promise',
        () => Promise.resolve({}),
        'a Promise (async providers are not supported)',
      ],
      ['an array', () => ['foo'], 'an array'],
      ['a string', { register: () => 'foo' }, 'string'],
      ['a function', () => () => ({}), 'function'],
      ['a class instance', () => new Date(), 'an instance of Date'],
      [
        'a thenable that is not a native Promise',
        () => ({ then() {} }),
        'a Promise (async providers are not supported)',
      ],
      [
        'an object posing as a Promise',
        () => Object.create(Promise.prototype) as object,
        'a Promise (async providers are not supported)',
      ],
      [
        'an object with inherited keys',
        () => Object.create({ port: 1 }) as object,
        'an object with a custom prototype',
      ],
      [
        'a Promise from another realm',
        () => runInNewContext('Promise.resolve({})') as object,
        'a Promise (async providers are not supported)',
      ],
      [
        'an object without a constructor',
        (): unknown => Object.create(Object.create(null)),
        'an object with a custom prototype',
      ],
    ])('should reject config that is %s', (_, provider, description) => {
      const error = thrown(() => new Gather(untyped(provider)));

      expect(error).toBeInstanceOf(InvalidProviderError);
      expect((error as Error).message).toBe(
        `Invalid config provider at index 0: expected a plain object as config, got ${description}`,
      );
    });

    it('should describe what a class without register() created', () => {
      class ReturnsConfig {
        constructor() {
          return { port: 1 };
        }
      }
      class ReturnsBare {
        constructor() {
          return Object.create(null) as object;
        }
      }

      for (const provider of untyped(ReturnsConfig, ReturnsBare)) {
        expect(() => new Gather([provider])).toThrow(
          'to have a register() method, got a plain object',
        );
      }
    });

    it('should reject a class without register()', () => {
      const error = thrown(() => new Gather(untyped({}, NoopProvider)));

      expect(error).toBeInstanceOf(InvalidProviderError);
      expect(error).toMatchObject({
        index: 1,
        message:
          'Invalid config provider at index 1: expected class NoopProvider to have a register() method, got an instance of NoopProvider',
      });
      expect(() => new Gather(untyped([class {}][0]))).toThrow(
        'expected class (anonymous) to have a register() method',
      );
    });

    it('should report holes in the list', () => {
      const providers: ConfigProvider[] = [{}];
      providers[2] = {};

      expect(() => new Gather(providers)).toThrow(
        `Invalid config provider at index 1: ${expected}, got undefined`,
      );
    });

    it('should reject a list that is not iterable', () => {
      expect(
        () => new Gather({ port: 1 } as unknown as ConfigProvider[]),
      ).toThrow(TypeError);
    });

    it('should reject a module whose register() is async', async () => {
      const unhandled: unknown[] = [];
      const listener = (reason: unknown) => unhandled.push(reason);
      process.on('unhandledRejection', listener);
      try {
        class AsyncModule {
          async register(): Promise<object> {
            await Promise.resolve();
            throw new Error('late');
          }
        }

        for (const provider of untyped(AsyncModule, new AsyncModule())) {
          expect(() => new Gather([provider])).toThrow(
            'expected a plain object as config, got a Promise (async providers are not supported)',
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      } finally {
        process.off('unhandledRejection', listener);
      }

      expect(unhandled).toEqual([]);
    });

    it('should not leave rejected Promises unhandled', async () => {
      const unhandled: unknown[] = [];
      const listener = (reason: unknown) => unhandled.push(reason);
      process.on('unhandledRejection', listener);
      try {
        const rejecting = async () => {
          await Promise.resolve();
          throw new Error('y');
        };
        expect(
          () => new Gather(untyped(Promise.reject(new Error('x')))),
        ).toThrow(InvalidProviderError);
        expect(() => new Gather(untyped(rejecting))).toThrow(
          InvalidProviderError,
        );
        expect(
          () =>
            new Gather(
              untyped(() => runInNewContext('Promise.reject(new Error("z"))')),
            ),
        ).toThrow(InvalidProviderError);
        class AsyncConstructor {
          constructor() {
            return Promise.reject(new Error('w'));
          }
        }
        expect(() => new Gather(untyped(AsyncConstructor))).toThrow(
          'expected class AsyncConstructor to have a register() method, got a Promise',
        );
        await new Promise((resolve) => setTimeout(resolve, 10));
      } finally {
        process.off('unhandledRejection', listener);
      }

      expect(unhandled).toEqual([]);
    });
  });

  describe('provider errors', () => {
    it('should name the provider and keep the error as cause', () => {
      const cause = new Error('boom');
      class Failing {
        constructor() {
          throw cause;
        }
      }
      const failing = () => {
        throw cause;
      };

      class FailingRegister {
        register(): never {
          throw cause;
        }
      }

      for (const provider of untyped(Failing, FailingRegister, failing, {
        register: failing,
      })) {
        const error = thrown(() => new Gather([{}, provider]));

        expect(error).toBeInstanceOf(ProviderFailedError);
        expect(error).toMatchObject({
          index: 1,
          message: 'Config provider at index 1 threw: boom',
          cause,
        });
      }
    });

    it('should wrap errors from a Gather that a provider uses itself', () => {
      const error = thrown(
        () => new Gather([{}, () => new Gather(untyped(42)).getMerged()]),
      );

      expect(error).toBeInstanceOf(ProviderFailedError);
      expect(error).toMatchObject({
        index: 1,
        message: `Config provider at index 1 threw: Invalid config provider at index 0: expected a class, function, plain object or module, got number`,
      });
      expect((error as Error).cause).toBeInstanceOf(InvalidProviderError);
    });

    it('should read the message of an error from another realm', () => {
      const cause = runInNewContext('new Error("from vm")') as unknown;
      const error = thrown(
        () =>
          new Gather([
            () => {
              throw cause;
            },
          ]),
      );

      expect((error as Error).message).toBe(
        'Config provider at index 0 threw: from vm',
      );
    });

    it('should describe a thrown value that is not an error', () => {
      const error = thrown(
        () =>
          new Gather([
            () => {
              // eslint-disable-next-line @typescript-eslint/only-throw-error
              throw 'boom';
            },
          ]),
      );

      expect(error).toBeInstanceOf(ProviderFailedError);
      expect(error).toMatchObject({
        message: 'Config provider at index 0 threw: boom',
        cause: 'boom',
      });
    });
  });

  describe('types', () => {
    it('should type providers by what Gather can read', () => {
      interface AppConfig {
        port: number;
        size: number;
      }
      class NeedsArgument {
        constructor(readonly name: string) {}
        register() {
          return {};
        }
      }

      expectTypeOf<AppConfig>().toExtend<ConfigProvider>();
      expectTypeOf<() => AppConfig>().toExtend<ConfigProvider>();
      expectTypeOf<() => void>().toExtend<ConfigProvider>();
      expectTypeOf(BarProvider).toExtend<ConfigProvider>();
      expectTypeOf(new BarProvider()).toExtend<ConfigProvider>();
      expectTypeOf(settings).toExtend<ConfigProvider>();
      expectTypeOf({
        foo: 'bar',
        nested: { list: [1] },
      }).toExtend<ConfigProvider>();

      expectTypeOf<string>().not.toExtend<ConfigProvider>();
      expectTypeOf<Array<{ foo: string }>>().not.toExtend<ConfigProvider>();
      expectTypeOf<Promise<{ foo: string }>>().not.toExtend<ConfigProvider>();
      expectTypeOf<Map<string, unknown>>().not.toExtend<ConfigProvider>();
      expectTypeOf<() => Promise<AppConfig>>().not.toExtend<ConfigProvider>();
      expectTypeOf<() => string[]>().not.toExtend<ConfigProvider>();
      expectTypeOf<(env: string) => AppConfig>().not.toExtend<ConfigProvider>();
      expectTypeOf(NeedsArgument).not.toExtend<ConfigProvider>();
      expectTypeOf(NoopProvider).not.toExtend<ConfigProvider>();
      expectTypeOf(
        class {
          async register() {
            return Promise.resolve({});
          }
        },
      ).not.toExtend<ConfigProvider>();
    });

    it('should accept any iterable of providers', () => {
      type Providers = ConstructorParameters<typeof Gather>[0];

      expectTypeOf<readonly ConfigProvider[]>().toExtend<Providers>();
      expectTypeOf<Set<ConfigProvider>>().toExtend<Providers>();
      expectTypeOf<Generator<ConfigProvider>>().toExtend<Providers>();
      expectTypeOf<Array<() => Promise<object>>>().not.toExtend<Providers>();
    });
  });
});
