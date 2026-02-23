import { EnvironmentProviders, Provider, Type } from '@angular/core';

export interface FederatedLoaderConfig {
  remoteEntry: string;
  exposedModule: string;
  componentName: string;
  moduleName: string;
  injectProviders: boolean;
}

export type FederatedLoaderConfigInput = Partial<FederatedLoaderConfig>;

export type FederatedErrorCode =
  | 'INVALID_CONFIG'
  | 'REMOTE_MODULE_LOAD_FAILED'
  | 'COMPONENT_NOT_FOUND'
  | 'INVALID_COMPONENT_EXPORT'
  | 'MODULE_NOT_FOUND'
  | 'INVALID_MODULE_EXPORT'
  | 'INVALID_PROVIDERS_EXPORT'
  | 'COMPONENT_RENDER_FAILED'
  | 'SERVICE_NOT_FOUND'
  | 'INVALID_SERVICE_EXPORT'
  | 'SERVICE_INSTANTIATION_FAILED'
  | 'LOAD_FAILED';

export interface FederatedError {
  code: FederatedErrorCode;
  message: string;
  cause?: unknown;
  details?: Record<string, unknown>;
}

export type Result<T, E = FederatedError> = { ok: true; value: T } | { ok: false; error: E };

export function okResult<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function errorResult(error: FederatedError): Result<never> {
  return { ok: false, error };
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeFederatedConfig(
  input: FederatedLoaderConfigInput | undefined,
  fallback: FederatedLoaderConfig,
): FederatedLoaderConfig {
  const candidate = input ?? {};

  const normalized: FederatedLoaderConfig = {
    remoteEntry: nonEmptyString(candidate.remoteEntry) ?? fallback.remoteEntry,
    exposedModule: nonEmptyString(candidate.exposedModule) ?? fallback.exposedModule,
    componentName: nonEmptyString(candidate.componentName) ?? fallback.componentName,
    moduleName: nonEmptyString(candidate.moduleName) ?? fallback.moduleName,
    injectProviders:
      typeof candidate.injectProviders === 'boolean'
        ? candidate.injectProviders
        : fallback.injectProviders,
  };

  if (!normalized.remoteEntry || !normalized.exposedModule || !normalized.componentName || !normalized.moduleName) {
    console.warn(
      'Federated config is incomplete: remoteEntry, exposedModule, componentName and moduleName are required.',
      normalized,
    );
  }

  return normalized;
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
  return isNgModuleType(candidate.ngModule);
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

    return Object.keys(entry).length > 0;
  };

  return value.every((entry) => {
    return isValidProviderEntry(entry);
  });
}
