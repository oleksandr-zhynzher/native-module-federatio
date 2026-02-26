import { NgModule } from '@angular/core';

import { isModuleWithProviders, isNgModule } from './index';

// A real @NgModule class compiled by the Angular compiler.
// Its presence of ɵmod and ɵfac is what isNgModule relies on.
@NgModule({ providers: [] })
class ExampleModule {}

// ─── isNgModule ──────────────────────────────────────────────────────────────

describe('isNgModule', () => {
  describe('falsy inputs', () => {
    it('returns false for null', () => {
      expect(isNgModule(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isNgModule(undefined)).toBe(false);
    });

    it('returns false for 0', () => {
      expect(isNgModule(0)).toBe(false);
    });

    it('returns false for an empty string', () => {
      expect(isNgModule('')).toBe(false);
    });
  });

  describe('non-function inputs', () => {
    it('returns false for a plain object', () => {
      expect(isNgModule({})).toBe(false);
    });

    it('returns false for an array', () => {
      expect(isNgModule([])).toBe(false);
    });

    it('returns false for a number', () => {
      expect(isNgModule(42)).toBe(false);
    });
  });

  describe('function inputs without Ivy symbols', () => {
    it('returns false for a plain function', () => {
      expect(isNgModule(function Fn() {})).toBe(false);
    });

    it('returns false for an arrow function', () => {
      expect(isNgModule(() => {})).toBe(false);
    });

    it('returns false for a class without Ivy symbols', () => {
      class PlainClass {}
      expect(isNgModule(PlainClass)).toBe(false);
    });

    it('returns false when only ɵmod is present', () => {
      function OnlyMod() {}
      Object.assign(OnlyMod, { ɵmod: {} });
      expect(isNgModule(OnlyMod)).toBe(false);
    });

    it('returns false when only ɵfac is present', () => {
      function OnlyFac() {}
      Object.assign(OnlyFac, { ɵfac: () => {} });
      expect(isNgModule(OnlyFac)).toBe(false);
    });
  });

  describe('valid Angular NgModule', () => {
    it('returns true for a class decorated with @NgModule', () => {
      expect(isNgModule(ExampleModule)).toBe(true);
    });

    it('returns true for an inline @NgModule class', () => {
      @NgModule({})
      class InlineModule {}
      expect(isNgModule(InlineModule)).toBe(true);
    });
  });
});

// ─── isModuleWithProviders ───────────────────────────────────────────────────

describe('isModuleWithProviders', () => {
  describe('falsy inputs', () => {
    it('returns false for null', () => {
      expect(isModuleWithProviders(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isModuleWithProviders(undefined)).toBe(false);
    });

    it('returns false for false', () => {
      expect(isModuleWithProviders(false)).toBe(false);
    });
  });

  describe('non-object inputs', () => {
    it('returns false for a plain function', () => {
      expect(isModuleWithProviders(() => {})).toBe(false);
    });

    it('returns false for a string', () => {
      expect(isModuleWithProviders('string')).toBe(false);
    });

    it('returns false for a number', () => {
      expect(isModuleWithProviders(42)).toBe(false);
    });
  });

  describe('object inputs without a valid ngModule', () => {
    it('returns false for an object without ngModule', () => {
      expect(isModuleWithProviders({ providers: [] })).toBe(false);
    });

    it('returns false when ngModule is null', () => {
      expect(isModuleWithProviders({ ngModule: null })).toBe(false);
    });

    it('returns false when ngModule is a string', () => {
      expect(isModuleWithProviders({ ngModule: 'string' })).toBe(false);
    });

    it('returns false when ngModule is a plain class without Ivy symbols', () => {
      class NotAModule {}
      expect(isModuleWithProviders({ ngModule: NotAModule })).toBe(false);
    });
  });

  describe('valid ModuleWithProviders shape', () => {
    it('returns true with a real @NgModule class as ngModule', () => {
      expect(isModuleWithProviders({ ngModule: ExampleModule, providers: [] })).toBe(true);
    });

    it('returns true even when providers key is absent', () => {
      expect(isModuleWithProviders({ ngModule: ExampleModule })).toBe(true);
    });

    it('returns true for an object without a providers key', () => {
      expect(isModuleWithProviders({ ngModule: ExampleModule })).toBe(true);
    });
  });
});
