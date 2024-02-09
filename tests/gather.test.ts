import { Gather } from '../src';
import { BarProvider } from './fixtures/bar.provider';
import { FooProvider } from './fixtures/foo.provider';
import { NoopProvider } from './fixtures/noop.provider';

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
