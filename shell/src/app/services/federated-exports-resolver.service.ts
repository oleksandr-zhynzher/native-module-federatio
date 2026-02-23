import { EnvironmentProviders, Injectable, Provider, Type } from '@angular/core';
import { isComponentType, isModuleWithProviders, isNgModuleType } from './federated-contract';

export interface ResolvedRemoteModuleType {
  ngModule: Type<unknown>;
  providers?: (Provider | EnvironmentProviders)[];
}

@Injectable({ providedIn: 'root' })
export class FederatedExportsResolverService {
  resolveComponentType(remoteExports: Record<string, unknown>, name: string): Type<unknown> | null {
    const registry = remoteExports['REMOTE_COMPONENTS'] as Record<string, unknown> | undefined;
    const candidate = registry?.[name] ?? remoteExports[name];

    if (!candidate) {
      console.warn(`Component '${name}' not found in remote exports.`);
      return null;
    }

    if (!isComponentType(candidate)) {
      console.warn(`Export '${name}' is not an Angular component type.`);
      return null;
    }

    return candidate;
  }

  resolveModuleType(remoteExports: Record<string, unknown>, name: string): ResolvedRemoteModuleType | null {
    const candidate = remoteExports[name];

    if (!candidate) {
      console.warn(`Module '${name}' not found in remote exports.`);
      return null;
    }

    if (isNgModuleType(candidate)) {
      return { ngModule: candidate };
    }

    if (isModuleWithProviders(candidate)) {
      return { ngModule: candidate.ngModule, providers: candidate.providers };
    }

    console.warn(`Export '${name}' is not an Angular NgModule type or ModuleWithProviders.`);
    return null;
  }
}