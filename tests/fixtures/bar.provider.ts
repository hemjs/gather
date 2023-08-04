import type { Module } from '@armscye/module';

export class BarProvider implements Module {
  register() {
    return { bar: 'bat' };
  }
}
