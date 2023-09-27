import type { Type } from '@armscye/core';
import type { Module } from '@armscye/module';

export type ConfigProvider = Type<Module> | Function | Record<string, any>;
