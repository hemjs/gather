import { describe, expect, it } from 'vitest';

import { merge } from '../src/index.js';

describe('merge', () => {
  it('should return empty object when absent target and absent source', () => {
    expect(merge()).toEqual({});
  });

  it('should merge object properties absent in target correctly', () => {
    expect(merge({}, { foo: 'bar' })).toEqual({ foo: 'bar' });
  });

  it('should merge array elements absent in target correctly', () => {
    expect(merge({}, { foo: ['bar'] })).toEqual({ foo: ['bar'] });
  });

  it('should override when object target and object source', () => {
    expect(merge({ foo: 'bar' }, { foo: 'baz' })).toEqual({ foo: 'baz' });
  });

  it('should concatenate when array target and array source', () => {
    expect(merge({ foo: ['bar'] }, { foo: ['baz'] })).toEqual({
      foo: ['bar', 'baz'],
    });
  });

  it('should deep override when object target and object source', () => {
    expect(merge({ foo: { bar: 'baz' } }, { foo: { bar: 'bat' } })).toEqual({
      foo: { bar: 'bat' },
    });
  });

  it('should handle when three way merge', () => {
    expect(merge({ foo: 'bar' }, { foo: 'baz' }, { foo: 'bat' })).toEqual({
      foo: 'bat',
    });
  });

  it('should return target when undefined source', () => {
    expect(merge({ foo: 'bar' }, undefined)).toEqual({ foo: 'bar' });
  });

  it('should return target when null source', () => {
    expect(merge({ foo: 'bar' }, null)).toEqual({ foo: 'bar' });
  });

  it('should return target when undefined source value', () => {
    expect(merge({ foo: 'bar' }, { foo: undefined })).toEqual({ foo: 'bar' });
  });

  it('should return target when null source value', () => {
    expect(merge({ foo: 'bar' }, { foo: null })).toEqual({ foo: 'bar' });
  });

  it('should replace a non-array value with a source array', () => {
    expect(merge({ foo: 'bar' }, { foo: ['baz'] })).toEqual({ foo: ['baz'] });
    expect(merge({ foo: 1 }, { foo: ['baz'] })).toEqual({ foo: ['baz'] });
    expect(merge({ foo: { bar: 1 } }, { foo: ['baz'] })).toEqual({
      foo: ['baz'],
    });
  });

  it('should replace an array with a source object', () => {
    expect(merge({ foo: ['bar'] }, { foo: { baz: 1 } })).toEqual({
      foo: { baz: 1 },
    });
  });

  it('should merge nested objects recursively', () => {
    expect(
      merge(
        { db: { options: { host: 'a', tags: ['x'] } } },
        { db: { options: { port: 1, tags: ['y'] } } },
      ),
    ).toEqual({ db: { options: { host: 'a', port: 1, tags: ['x', 'y'] } } });
  });

  it('should replace values that are not plain objects', () => {
    const date = new Date(1);
    const map = new Map([['a', 1]]);
    const config = merge({ date: new Date(0), map: new Map() }, { date, map });

    expect(config['date']).toBe(date);
    expect(config['map']).toBe(map);
  });

  it('should not change sources', () => {
    const first = { foo: { bar: ['a'] } };
    const second = { foo: { bar: ['b'] } };
    merge({}, first, second);

    expect(first).toEqual({ foo: { bar: ['a'] } });
    expect(second).toEqual({ foo: { bar: ['b'] } });
  });

  it('should skip symbol keys', () => {
    const key = Symbol('logger');

    expect(merge({}, { [key]: 1, db: { [key]: 2, host: 'a' } })).toEqual({
      db: { host: 'a' },
    });
    expect(Object.getOwnPropertySymbols(merge({}, { [key]: 1 }))).toEqual([]);
  });

  it('should ignore __proto__ keys', () => {
    const config = merge({}, JSON.parse('{"__proto__": {"polluted": true}}'));

    expect(Object.getPrototypeOf(config)).toBe(Object.prototype);
    expect(config['polluted']).toBeUndefined();
  });

  it.each([
    '{"__proto__": {"polluted": true}}',
    '{"nested": {"__proto__": {"polluted": true}}}',
  ])('should not replace any prototype with %s', (payload) => {
    class Target {}
    const targets = [{}, Object.create(null) as object, new Target()];

    for (const target of targets) {
      const prototype: unknown = Object.getPrototypeOf(target);
      const merged = merge(target, JSON.parse(payload) as object);

      // `__proto__` would replace this target's own prototype, so the
      // injected keys would show through inheritance.
      expect(Object.getPrototypeOf(merged)).toBe(prototype);
      expect(merged['polluted']).toBeUndefined();
      expect(merged['nested']?.polluted).toBeUndefined();
    }

    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty('polluted');
    expect(Target.prototype).not.toHaveProperty('polluted');
  });

  it('should start from an empty object when target is falsy', () => {
    expect(merge(0 as unknown as object, { a: 1 })).toEqual({ a: 1 });
  });

  it('should change target in place and return it', () => {
    const target = { foo: 'bar' };

    expect(merge(target, { baz: 1 })).toBe(target);
    expect(target).toEqual({ foo: 'bar', baz: 1 });
  });

  it('should merge objects with a null prototype', () => {
    const source = Object.assign(Object.create(null) as object, {
      a: { b: 1 },
    });

    expect(merge({ a: { c: 2 } }, source)).toEqual({ a: { b: 1, c: 2 } });
  });

  it('should merge the same object in several places', () => {
    const shared = { a: 1 };

    expect(merge({}, { x: shared, y: shared }, { x: shared })).toEqual({
      x: { a: 1 },
      y: { a: 1 },
    });
  });
});
