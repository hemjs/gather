import type { Module } from '@armscye/module';

export class FooProvider implements Module {
  register() {
    return { foo: ['bar'] };
  }
}
