import {
  ComponentRef,
  EnvironmentInjector,
  EnvironmentProviders,
  NgModule,
  Provider,
  Type,
} from '@angular/core';
import { LoadRemoteModuleOptions } from '@angular-architects/module-federation';
import { ActionCreator, MemoizedSelector } from '@ngrx/store';

export interface RyFederatedModule {
  providers?: (Provider | EnvironmentProviders)[];
  actions?: Record<string, ActionCreator>;
  selectors?: Record<string, MemoizedSelector<unknown, unknown>>;
  ngModule?: NgModule;
  components?: Record<string, Type<unknown>>;
  services?: Record<string, Type<unknown>>;
}

export enum RemoteModuleType {
  Script = 'script',
  Module = 'module',
  Manifest = 'manifest',
}

export type RyLoadRemoteModuleOptions = LoadRemoteModuleOptions & {
  type: 'script' | 'module' | 'manifest';
  remoteEntry: string;
  version?: string;
  libName?: string;
  componentName?: string;
  moduleName?: string;
};

export interface RemoteComponentRef {
  componentRef: ComponentRef<unknown>;
  destroy(): void;
}

export interface RemoteComponentData {
  component?: Type<unknown> | null;
  ngModule?: Type<unknown> | null;
  providers: (Provider | EnvironmentProviders)[];
}

export interface RemoteModuleInjector {
  readonly injector: EnvironmentInjector;
  destroy(): void;
}
