import {
  ComponentRef,
  EnvironmentInjector,
  EnvironmentProviders,
  Provider,
  Type,
} from '@angular/core';
import { LoadRemoteModuleOptions } from '@angular-architects/module-federation';

export interface RyFederatedModule {
  providers?: (Provider | EnvironmentProviders)[];
  actions?: Record<string, unknown>;
  selectors?: Record<string, unknown>;
  ngModule?: Type<unknown>;
  components?: Record<string, Type<unknown>>;
  services?: Record<string, Type<unknown>>;
}

export enum RemoteModuleType {
  Script = 'script',
  Module = 'module',
  Manifest = 'manifest',
}

export type RyLoadRemoteModuleOptions = Omit<LoadRemoteModuleOptions, 'type' | 'remoteEntry'> & {
  type: RemoteModuleType;
  remoteEntry: string;
  componentName?: string;
  moduleName?: string;
};

export interface RemoteComponentRef {
  componentRef: ComponentRef<unknown>;
  destroy(): void;
}

export interface RemoteComponentData {
  component: Type<unknown> | null;
  ngModule: Type<unknown> | null;
  providers: (Provider | EnvironmentProviders)[];
}

export interface RemoteModuleInjector {
  readonly injector: EnvironmentInjector;
  destroy(): void;
}

/**
 * Wraps a resolved remote service instance together with the injector
 * lifecycle handle. The caller is responsible for calling `destroy()` when
 * the service is no longer needed.
 */
export interface RemoteServiceRef<T> {
  readonly service: T;
}
