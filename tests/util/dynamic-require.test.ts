import { join } from 'path';

import { dynamicRequire } from '../../src/util/dynamic-require';

describe('dynamicRequire', () => {
  test('ESM', () => {
    const content = dynamicRequire(
      join(__dirname, '..', 'fixtures', 'dynamic', 'esm'),
    );

    expect(content).toBeDefined();
    expect(content).toMatchObject(expect.objectContaining({ foo: 'bar' }));
  });

  test('CJS', () => {
    const content = dynamicRequire(
      join(__dirname, '..', 'fixtures', 'dynamic', 'cjs'),
    );

    expect(content).toBeDefined();
    expect(content).toMatchObject(expect.objectContaining({ foo: 'bar' }));
  });
});
