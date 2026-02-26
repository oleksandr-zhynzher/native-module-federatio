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

export type FederatedProviders = readonly (Provider | EnvironmentProviders)[];
export type FederatedActions = Record<string, ActionCreator>;
export type FederatedSelectors = Record<string, MemoizedSelector<unknown, unknown>>;
export type FederatedEntity = Record<string, Type<unknown>>;
export type RemoteModuleType = LoadRemoteModuleOptions['type'];

export enum FederatedModuleType {
  Script = 'script',
  Module = 'module',
  Manifest = 'manifest',
}

/**
 * Maps the internal FederatedModuleType enum to the string literals expected by
 * @angular-architects/module-federation. The values are intentionally identical today,
 * but this indirection decouples the public API surface of this library from the
 * third-party type so that a breaking change in the upstream package can be absorbed
 * here without affecting every call site.
 */
export const MODULE_TYPE_MAP: Record<FederatedModuleType, RemoteModuleType> = {
  [FederatedModuleType.Script]: 'script',
  [FederatedModuleType.Module]: 'module',
  [FederatedModuleType.Manifest]: 'manifest',
};

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
}

/** Extends the base module options with a required component name for component loading. */
export interface LoadFederatedComponentOptions extends LoadFederatedModuleOptions {
  componentName: string;
}

export interface FederatedComponentRef {
  componentRef: ComponentRef<unknown>;
  destroy: () => void;
}

export interface FederatedServiceRef<T = unknown> {
  serviceRef: T;
  destroy: () => void;
}

export interface ResolvedFederatedComponent {
  componentType: Type<unknown>;
  federatedModule: FederatedModule;
}
