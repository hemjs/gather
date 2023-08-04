import { join } from 'path';

import { loadFromFiles } from '../src';

test('should load and merge config from files', () => {
  const config = loadFromFiles(
    join(__dirname, 'fixtures', 'autoload/{{,*.}global,{,*.}local}.+(j|t)s'),
  );

  expect(config).toEqual({ foo: 'bar', bar: 'bat' });
});
