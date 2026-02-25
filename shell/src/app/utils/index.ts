import { ModuleWithProviders, Type } from '@angular/core';

export const isNgModule = (candidate: unknown): candidate is Type<unknown> => {
  return !!candidate && typeof candidate === 'function' && candidate.hasOwnProperty('ɵmod');
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
