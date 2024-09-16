import type { Type } from '@armscye/core';
import type { Module } from '@armscye/module';
import { isFunction, isObject, isPlainObject } from '@hemjs/notions';
import { uid } from 'uid';

import { merge } from './utils';

export type ConfigProvider =
  | Type<Module>
  | Record<string, any>
  | ((...args: any[]) => any);

/**
 * Gather configuration generated by configuration providers.
 */
export class Gather {
  private config: Record<string, any>;

  /**
   * Create a new Gather instance.
   * @param providers the configuration providers
   */
  constructor(providers: Array<ConfigProvider> = []) {
    this.config = this.loadFromProviders(providers);
  }

  /**
   * Returns merged configurations object
   * @returns merged configurations object
   */
  public getMerged(): Record<string, any> {
    return this.config;
  }

  /**
   * Iterate providers, merging config from each with the previous.
   * @param providers an array of configuration providers
   * @returns merged configurations object
   */
  private loadFromProviders(
    providers: Array<ConfigProvider>,
  ): Record<string, any> {
    const merged: Record<string, any> = {};
    for (const provider of providers) {
      const instance = this.resolveProvider(provider);
      if (this.isModuleProvider(instance)) {
        merge(merged, (instance as any).register());
      } else if (isPlainObject(instance)) {
        merge(merged, instance);
      }
    }
    return merged;
  }

  /**
   * Resolve a provider.
   * @param providers an array of configuration providers
   * @returns merged configurations object
   */
  private resolveProvider(provider: ConfigProvider): ConfigProvider {
    if (isObject(provider)) {
      return provider;
    }
    if (this.isProviderClass(provider)) {
      const typeProvider = provider as Type<any>;
      return new typeProvider();
    }
    if (!isFunction(provider)) {
      throw new Error('Invalid config provider');
    }
    const metatype = this.mapToClass(provider);
    return new metatype();
  }

  /**
   * Check if the given provider is a class.
   * @param provider the provider to check
   * @returns true if class, false otherwise
   */
  private isProviderClass(provider: ConfigProvider): provider is Type<any> {
    const providerStr = provider.toString();
    if (providerStr.substring(0, 5) === 'class') {
      return true;
    }
    return false;
  }

  /**
   * Check if the given provider has the register method.
   * @param provider the provider to check
   * @returns whether the given provider has the register method
   */
  private isModuleProvider(provider: ConfigProvider): provider is Module {
    return isFunction((provider as Module).register);
  }

  /**
   * Map a function to a class.
   * @param instance the function to map
   * @returns the resulting class
   */
  private mapToClass<T extends (...args: any[]) => any>(
    instance: T,
  ): Type<Module> {
    return this.assignToken(
      class {
        register = (...params: Array<unknown>) => {
          return instance(...params);
        };
      },
    );
  }

  /**
   * Assign unique token to a metatype.
   * @param metatype the metatype to assign token
   * @param token the unique token
   * @returns the resulting metatype
   */
  private assignToken(metatype: Type<Module>, token = uid(21)): Type<Module> {
    Object.defineProperty(metatype, 'name', { value: token });
    return metatype;
  }
}
