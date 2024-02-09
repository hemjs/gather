import { isNil, isObject } from '@hemjs/notions';

export function merge(
  target?: Record<string, any>,
  ...sources: Array<{} | undefined | null>
): Record<string, any> {
  target = target || {};
  for (let i = 0; i < sources.length; i++) {
    const source: any = sources[i] || {};
    for (const key in source) {
      if (!isNil(source[key])) {
        let obj = target[key];
        const value = source[key];
        if (Array.isArray(value)) {
          obj = isNil(obj) ? [] : obj;
          target[key] = obj.concat(value);
        } else if (isObject(obj) && isObject(value)) {
          target[key] = { ...obj, ...value };
        } else {
          target[key] = value;
        }
      }
    }
  }
  return target;
}
