import { isNil, isPlainObject } from '@hemjs/notions';

/**
 * Merge sources into target, left to right, and return target.
 *
 * - `null` and `undefined` source values are skipped.
 * - Arrays are concatenated onto an existing array, or replace any other value.
 * - Plain objects are merged recursively into an existing plain object.
 * - Any other value, including dates, maps and class instances, replaces the
 *   existing value.
 *
 * Merged arrays and objects are copies, so later merges never change a source.
 */
export function merge(
  target?: Record<string, any>,
  ...sources: Array<object | undefined | null>
): Record<string, any> {
  target = target || {};
  for (const source of sources) {
    if (isNil(source)) {
      continue;
    }
    for (const [key, value] of Object.entries(source)) {
      // Assigning `__proto__` would replace the target's prototype.
      if (key === '__proto__' || isNil(value)) {
        continue;
      }
      const existing = target[key];
      if (Array.isArray(value)) {
        target[key] = Array.isArray(existing)
          ? [...existing, ...value]
          : [...value];
      } else if (isPlainObject(value)) {
        target[key] = merge(
          isPlainObject(existing) ? { ...existing } : {},
          value,
        );
      } else {
        target[key] = value;
      }
    }
  }
  return target;
}
