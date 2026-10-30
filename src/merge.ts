import { isPlainObject } from './utils.js';

/**
 * Merge sources into target, left to right, and return target.
 *
 * - `null` and `undefined` source values, `__proto__` keys and symbol keys are
 *   skipped.
 * - Arrays are concatenated onto an existing array, or replace any other value.
 * - Plain objects are merged recursively into an existing plain object.
 * - Any other value, including dates, maps and class instances, replaces the
 *   existing value.
 *
 * Target is changed in place. Merged arrays and objects are shallow copies, so
 * merging never changes a source's own objects or arrays.
 *
 * Sources are expected to be plain data: tree-shaped, without cycles.
 */
export function merge(
  target?: Record<string, any>,
  ...sources: ReadonlyArray<object | null | undefined>
): Record<string, any> {
  target ||= {};
  for (const source of sources) {
    if (source == null) {
      continue;
    }
    for (const [key, value] of Object.entries(source)) {
      // Assigning `__proto__` would replace the target's prototype.
      if (key === '__proto__' || value == null) {
        continue;
      }
      const existing: unknown = target[key];
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
