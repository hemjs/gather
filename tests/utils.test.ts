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
});
