import { Provider, Type, reflectComponentType } from '@angular/core';

/**
 * Typed descriptor for a remote NgModule export.
 * Accepted shapes:
 *   - a plain NgModule class (wrapped automatically)
 *   - a ModuleWithProviders-shaped object: { ngModule, providers? }
 */
export interface RemoteNgModuleDescriptor {
  ngModule: Type<unknown>;
  providers?: Provider[];
}

/**
 * Resolves a component type from remote exports using Angular's public
 * reflectComponentType() API — no private metadata symbols.
 *
 * Lookup order:
 *   1. REMOTE_COMPONENTS registry (preferred typed map)
 *   2. named export fallback
 */
export function resolveComponentType(
  remoteExports: Record<string, unknown>,
  name: string,
): Type<unknown> | null {
  const registry = remoteExports['REMOTE_COMPONENTS'] as Record<string, unknown> | undefined;
  const candidate = registry?.[name] ?? remoteExports[name];

  if (typeof candidate !== 'function' || reflectComponentType(candidate as Type<unknown>) === null) {
    console.warn(`Component '${name}' not found or is not an Angular component.`);
    return null;
  }

  return candidate as Type<unknown>;
}

/**
 * Resolves a RemoteNgModuleDescriptor from remote exports using
 * structural duck-typing only — no private Angular metadata symbols.
 *
 * Accepted remote export shapes:
 *   - Plain NgModule class:                  export { MyModule as ngModule }
 *   - ModuleWithProviders-shaped descriptor: export const ngModule = { ngModule: MyModule, providers: [] }
 *
 * Angular itself validates whether the resolved class is truly an NgModule
 * when createNgModule() is called, so no private reflection is needed here.
 */
export function resolveModuleType(
  remoteExports: Record<string, unknown>,
  name: string,
): RemoteNgModuleDescriptor | null {
  const candidate = remoteExports[name];

  if (!candidate) {
    console.warn(`Module '${name}' not found in remote exports.`);
    return null;
  }

  // ModuleWithProviders-shaped descriptor: { ngModule: Class, providers?: Provider[] }
  if (
    typeof candidate === 'object' &&
    candidate !== null &&
    'ngModule' in candidate &&
    typeof (candidate as { ngModule: unknown }).ngModule === 'function'
  ) {
    return candidate as RemoteNgModuleDescriptor;
  }

  // Plain NgModule class exported directly
  if (typeof candidate === 'function') {
    return { ngModule: candidate as Type<unknown> };
  }

  console.warn(
    `Export '${name}' is not a valid NgModule class or RemoteNgModuleDescriptor. ` +
      `Expected either an NgModule class or { ngModule: NgModuleClass, providers?: Provider[] }.`,
  );
  return null;
}
