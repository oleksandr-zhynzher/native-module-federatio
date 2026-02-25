import {
  ComponentRef,
  EnvironmentInjector,
  EnvironmentProviders,
  ModuleWithProviders,
  NgModuleRef,
  Provider,
  Type,
} from '@angular/core';
import { LoadRemoteModuleOptions } from '@angular-architects/module-federation';
import { ActionCreator, MemoizedSelector } from '@ngrx/store';

export type FederatedProviders = (Provider | EnvironmentProviders)[];
export type FederatedActions = Record<string, ActionCreator>;
export type FederatedSelectors = Record<string, MemoizedSelector<unknown, unknown>>;
export type FederatedEntity = Record<string, Type<unknown>>;

export enum FederatedModuleType {
  Script = 'script',
  Module = 'module',
  Manifest = 'manifest',
}

export interface FederatedModule {
  components: FederatedEntity | null;
  services: FederatedEntity | null;
  actions: FederatedActions | null;
  selectors: FederatedSelectors | null;
  providers: FederatedProviders;
  injector: EnvironmentInjector;
  ngModuleRef: NgModuleRef<unknown> | null;
  destroy: () => void;
}

export interface RawFederatedModule {
  components?: FederatedEntity;
  services?: FederatedEntity;
  actions?: FederatedActions;
  selectors?: FederatedSelectors;
  providers?: FederatedProviders;
  module?: ModuleWithProviders<unknown>;
  [key: string]: unknown;
}

export interface LoadFederatedModuleOptions extends Omit<
  LoadRemoteModuleOptions,
  'type' | 'remoteEntry'
> {
  type: FederatedModuleType;
  remoteEntry: string;
  moduleName?: string;
  componentName?: string;
}

export interface FederatedComponentRef {
  componentRef: ComponentRef<unknown>;
  destroyFederatedModuleRef: () => void;
}
