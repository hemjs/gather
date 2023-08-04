import { GlobOptions, globSync } from 'glob';

import { dynamicRequire } from './util/dynamic-require';
import { merge } from './util/merge';

/**
 * Provide a collection of (j|t)s files returning config objects.
 *
 * @param pattern a glob pattern by which to look up config files
 * @param options optional glob options
 * @returns merged configurations object
 */
export function loadFromFiles(pattern: string, options: GlobOptions = {}) {
  let config = {};
  // Load configuration from autoload path
  const paths = globSync(pattern, options);
  // Require each file in the autoload dir and merge configurations
  paths.forEach((file: any) => {
    config = merge(config, dynamicRequire(file));
  });
  // return an object containing of merged configurations
  return config;
}
