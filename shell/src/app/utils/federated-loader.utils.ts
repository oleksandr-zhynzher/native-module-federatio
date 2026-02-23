import { Type } from '@angular/core';

export function resolveComponentType(remoteExports: Record<string, any>, name: string): Type<unknown> | null {
  const registry = remoteExports['REMOTE_COMPONENTS'];
  const candidate = registry?.[name] ?? remoteExports[name];

  if (!candidate || typeof candidate !== 'function' || !(candidate as any).ɵcmp) {
    console.warn(`Component '${name}' not found or is not an Angular component.`);
    return null;
  }
  return candidate as Type<unknown>;
}

export function resolveModuleType(remoteExports: Record<string, any>, name: string): { ngModule: Type<unknown>; providers?: any[] } | null {
  const candidate = remoteExports[name];
  if (!candidate) {
    console.warn(`Module '${name}' not found in remote exports.`);
    return null;
  }

  if (typeof candidate === 'function' && (candidate as any).ɵmod) {
    return { ngModule: candidate as Type<unknown> };
  }

  if (typeof candidate === 'object' && candidate.ngModule && typeof candidate.ngModule === 'function' && (candidate.ngModule as any).ɵmod) {
    return { ngModule: candidate.ngModule, providers: candidate.providers };
  }

  console.warn(`Export '${name}' is not an Angular NgModule.`);
  return null;
}
