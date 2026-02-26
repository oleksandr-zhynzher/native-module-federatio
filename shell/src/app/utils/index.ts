import { ModuleWithProviders, Type } from '@angular/core';

// Angular does not expose a stable public API for detecting NgModule classes at runtime.
// The properties `ɵmod` and `ɵfac` are Ivy compiler-emitted symbols used here intentionally
// to support remotes that export a raw NgModule class rather than a ModuleWithProviders wrapper.
// This is an accepted architectural requirement.
//
// MAINTENANCE CONTRACT: if Angular renames or removes these symbols, isNgModule will always
// return false, silently breaking all NgModule-based remotes. When upgrading Angular, verify
// that raw NgModule remotes still resolve correctly and update these property names if needed.
export const isNgModule = (candidate: unknown): candidate is Type<unknown> => {
  return (
    !!candidate &&
    typeof candidate === 'function' &&
    candidate.hasOwnProperty('ɵmod') &&
    candidate.hasOwnProperty('ɵfac')
  );
};

export const isModuleWithProviders = (
  candidate: unknown,
): candidate is ModuleWithProviders<unknown> => {
  return (
    !!candidate &&
    typeof candidate === 'object' &&
    'ngModule' in candidate &&
    isNgModule(candidate.ngModule)
  );
};
