import type { Module } from '@armscye/module';

export function isPlainObject(value: unknown): value is Record<string, any> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const proto = Object.getPrototypeOf(value) as object | null;
  return (
    proto === null ||
    proto === Object.prototype ||
    (Object.getPrototypeOf(proto) === null &&
      Object.hasOwn(proto, 'hasOwnProperty'))
  );
}

export function isThenable(value: unknown): boolean {
  return typeof (value as { then?: unknown } | null)?.then === 'function';
}

export function isConfigObject(value: unknown): value is Record<string, any> {
  return isPlainObject(value) && !isThenable(value);
}

export function isClass(fn: object): boolean {
  const { prototype } = fn as { prototype?: Partial<Module> };
  return (
    typeof prototype?.register === 'function' ||
    /^class\b(?!\s*\()/.test(Function.prototype.toString.call(fn))
  );
}

export function isModule(value: unknown): value is Module {
  return typeof (value as Partial<Module> | null)?.register === 'function';
}
