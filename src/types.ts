import type { Type } from '@armscye/core';
import type { Module } from '@armscye/module';

export type Provider = Type<Module> | Function | Record<string, any>;
