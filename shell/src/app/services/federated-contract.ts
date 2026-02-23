import { EnvironmentProviders, Provider, Type } from '@angular/core';

export interface FederatedLoaderConfig {
  remoteEntry: string;
  exposedModule: string;
  componentName: string;
  moduleName: string;
}

export interface FederatedError {
  message: string;
  cause?: unknown;
  details?: Record<string, unknown>;
}

export function isComponentType(value: unknown): value is Type<unknown> {
  return typeof value === 'function' && Boolean((value as { ɵcmp?: unknown }).ɵcmp);
}

export function isNgModuleType(value: unknown): value is Type<unknown> {
  return typeof value === 'function' && Boolean((value as { ɵmod?: unknown }).ɵmod);
}

export function isModuleWithProviders(
  value: unknown,
): value is { ngModule: Type<unknown>; providers?: (Provider | EnvironmentProviders)[] } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as { ngModule?: unknown; providers?: unknown };
  if (!isNgModuleType(candidate.ngModule)) {
    return false;
  }

  if (candidate.providers === undefined) {
    return true;
  }

  return isValidProvidersArray(candidate.providers);
}

function isEnvironmentProvidersLike(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return 'ɵproviders' in candidate || 'ɵfromNgModule' in candidate;
}

export function isValidProvidersArray(
  value: unknown,
): value is (Provider | EnvironmentProviders)[] {
  if (!Array.isArray(value)) {
    return false;
  }

  const isValidProviderEntry = (entry: unknown): boolean => {
    if (Array.isArray(entry)) {
      return entry.every((nestedEntry) => isValidProviderEntry(nestedEntry));
    }

    if (typeof entry === 'function') {
      return true;
    }

    if (typeof entry !== 'object' || entry === null) {
      return false;
    }

    if (isEnvironmentProvidersLike(entry)) {
      return true;
    }

    if (Array.isArray(entry)) {
      return entry.every((nestedEntry) => isValidProviderEntry(nestedEntry));
    }

    const candidate = entry as Record<string, unknown>;
    return 'provide' in candidate;
  };

  return value.every((entry) => {
    return isValidProviderEntry(entry);
  });
}
