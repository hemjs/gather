import type { Module } from '@armscye/module';

/**
 * A config object. Arrays, Promises, Maps, Sets and functions are rejected at
 * compile time; at runtime, Gather also requires a plain object.
 */
export type ConfigObject = {
  [key: string]: any;
  apply?: never;
  then?: never;
  [Symbol.iterator]?: never;
};

/**
 * Something Gather can read config from: a module class, a module instance,
 * a function returning a config object, or a config object.
 */
export type ConfigProvider =
  | (new () => Module & {
      register(): ConfigObject | null | undefined | void;
    })
  | Module
  | (() => ConfigObject | null | undefined | void)
  | ConfigObject;
