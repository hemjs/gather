import { expect, test } from 'vitest';

import { Gather, type ConfigProvider } from '../src/index.js';
import { BarProvider } from './fixtures/bar.provider.js';
import { FooProvider } from './fixtures/foo.provider.js';
import { NoopProvider } from './fixtures/noop.provider.js';

test('should return an instance of Gather', () => {
  const gather = new Gather();

  expect(gather).toBeInstanceOf(Gather);
});

test('should merge config when class providers', () => {
  const gather = new Gather([BarProvider, FooProvider]);
  const config = gather.getMerged();

  expect(config).toEqual({ bar: 'bat', foo: ['bar'] });
});

test('should merge config when instance providers', () => {
  const gather = new Gather([new BarProvider(), new FooProvider()]);
  const config = gather.getMerged();

  expect(config).toEqual({ bar: 'bat', foo: ['bar'] });
});

test('should merge config when noop providers', () => {
  const gather = new Gather([BarProvider, NoopProvider]);
  const config = gather.getMerged();

  expect(config).toEqual({ bar: 'bat' });
});

test('should merge config when function providers', () => {
  const gather = new Gather([
    () => {
      return { baz: 'baz' };
    },
  ]);
  const config = gather.getMerged();

  expect(config).toEqual({ baz: 'baz' });
});

test('should merge config when object providers', () => {
  const gather = new Gather([{ bar: 'bat' }, { foo: ['bar'] }, { baz: 'baz' }]);
  const config = gather.getMerged();

  expect(config).toEqual({ bar: 'bat', foo: ['bar'], baz: 'baz' });
});

test('should merge config when mix providers', () => {
  const gather = new Gather([
    new BarProvider(),
    FooProvider,
    () => {
      return { baz: 'baz' };
    },
    { baz: 'baz' },
  ]);
  const config = gather.getMerged();

  expect(config).toEqual({ bar: 'bat', foo: ['bar'], baz: 'baz' });
});

test('should overwrite when object providers', () => {
  const gather = new Gather([new BarProvider(), new BarProvider()]);
  const config = gather.getMerged();

  expect(config).toEqual({ bar: 'bat' });
});

test('should concatenate when array providers', () => {
  const gather = new Gather([
    new BarProvider(),
    new FooProvider(),
    new FooProvider(),
  ]);
  const config = gather.getMerged();

  expect(config).toEqual({ bar: 'bat', foo: ['bar', 'bar'] });
});

test('should throw when invalid provider', () => {
  expect(() => new Gather(['invalid-provider' as any])).toThrow();
});

test('should throw with the index when invalid provider', () => {
  expect(() => new Gather([{}, 42 as any])).toThrow(
    'Invalid config provider at index 1: expected a class, function or object, got number',
  );
  expect(() => new Gather([null as any])).toThrow('got null');
});

test('should throw when array provider', () => {
  expect(() => new Gather([[{ foo: 'bar' }]])).toThrow(
    'Invalid config provider at index 0: got an array',
  );
});

test('should throw when async provider', () => {
  expect(() => new Gather([() => Promise.resolve({ foo: 'bar' })])).toThrow(
    'Invalid config from provider at index 0: expected a plain object, got a Promise',
  );
});

test('should throw when a promise is passed as a provider', () => {
  expect(() => new Gather([{}, Promise.resolve({ foo: 'bar' })])).toThrow(
    'Invalid config provider at index 1: got a Promise (async providers are not supported)',
  );
});

test('should throw when provider returns a class instance', () => {
  class DbConfig {
    host = 'localhost';
  }

  expect(() => new Gather([() => new DbConfig()])).toThrow(
    'expected a plain object, got an instance of DbConfig',
  );
});

test('should throw when provider returns a non-object', () => {
  expect(() => new Gather([() => ['foo']])).toThrow('got an array');
  expect(() => new Gather([{ register: () => 'foo' }])).toThrow('got string');
  expect(() => new Gather([() => new Date()])).toThrow(
    'got an instance of Date',
  );
  expect(() => new Gather([() => Object.create(Object.create(null))])).toThrow(
    'got an object',
  );
});

test('should skip providers that return nothing', () => {
  const gather = new Gather([() => undefined, BarProvider]);

  expect(gather.getMerged()).toEqual({ bar: 'bat' });
});

test('should instantiate classes written without a space before the body', () => {
  // A minified class; `new Function` keeps the transpiler from reformatting it.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const createMinified = new Function(
    'return class{register(){return {foo: "bar"}}}',
  ) as () => ConfigProvider;
  const Minified = createMinified();
  const gather = new Gather([Minified]);

  expect(gather.getMerged()).toEqual({ foo: 'bar' });
});

test('should treat an object with a register function as a module', () => {
  const gather = new Gather([{ register: () => ({ foo: 'bar' }), baz: 1 }]);

  expect(gather.getMerged()).toEqual({ foo: 'bar' });
});

test('should throw when the provider list has holes', () => {
  const providers: ConfigProvider[] = [{}];
  providers[2] = {};

  expect(() => new Gather(providers)).toThrow(
    'Invalid config provider at index 1: expected a class, function or object, got undefined',
  );
});
