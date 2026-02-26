import { TestBed } from '@angular/core/testing';
import { NgModule } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { loadRemoteModule } from '@angular-architects/module-federation';

import { FederatedModuleFacadeService } from './federated-module-facade.service';
import { FederatedModuleType, LoadFederatedModuleOptions } from '../models';

// Must be at the top level — Vitest hoists vi.mock calls before imports.
vi.mock('@angular-architects/module-federation', () => ({
  loadRemoteModule: vi.fn(),
}));

// A real decorated NgModule used to exercise the raw-NgModule resolution path.
@NgModule({ providers: [{ provide: 'REMOTE_TOKEN', useValue: 'hello' }] })
class RemoteModule {}

const BASE_CONFIG: LoadFederatedModuleOptions = {
  type: FederatedModuleType.Module,
  remoteEntry: 'http://localhost:4300/remoteEntry.js',
  exposedModule: './public-api',
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function mockLoad(raw: Record<string, unknown> = {}): void {
  vi.mocked(loadRemoteModule).mockResolvedValue(raw);
}

// ─── suite ───────────────────────────────────────────────────────────────────

describe('FederatedModuleFacadeService', () => {
  let service: FederatedModuleFacadeService;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({});
    service = TestBed.inject(FederatedModuleFacadeService);
  });

  afterEach(() => TestBed.resetTestingModule());

  // ── validation ──────────────────────────────────────────────────────────

  describe('getFederatedModule – input validation', () => {
    it('rejects when remoteEntry is empty', async () => {
      await expect(
        firstValueFrom(service.getFederatedModule({ ...BASE_CONFIG, remoteEntry: '' })),
      ).rejects.toThrow('getFederatedModule: config.remoteEntry is required');
    });

    it('rejects when exposedModule is empty', async () => {
      await expect(
        firstValueFrom(service.getFederatedModule({ ...BASE_CONFIG, exposedModule: '' })),
      ).rejects.toThrow('getFederatedModule: config.exposedModule is required');
    });

    it('rejects when type is falsy', async () => {
      await expect(
        firstValueFrom(service.getFederatedModule({ ...BASE_CONFIG, type: '' as FederatedModuleType })),
      ).rejects.toThrow('getFederatedModule: config.type is required');
    });

    it('does not call loadRemoteModule when validation fails', async () => {
      await firstValueFrom(
        service.getFederatedModule({ ...BASE_CONFIG, remoteEntry: '' }),
      ).catch(() => {});
      expect(loadRemoteModule).not.toHaveBeenCalled();
    });
  });

  // ── happy path ──────────────────────────────────────────────────────────

  describe('getFederatedModule – successful resolution', () => {
    it('returns a FederatedModule with components from the raw module', async () => {
      class MyComp {}
      mockLoad({ components: { MyComp } });

      const result = await firstValueFrom(service.getFederatedModule(BASE_CONFIG));

      expect(result.components).toEqual({ MyComp });
      result.destroy();
    });

    it('returns null for optional fields absent from the raw module', async () => {
      mockLoad({});

      const result = await firstValueFrom(service.getFederatedModule(BASE_CONFIG));

      expect(result.components).toBeNull();
      expect(result.actions).toBeNull();
      expect(result.selectors).toBeNull();
      expect(result.services).toBeNull();
      expect(result.ngModuleRef).toBeNull();
      result.destroy();
    });

    it('exposes a live EnvironmentInjector', async () => {
      mockLoad({});

      const result = await firstValueFrom(service.getFederatedModule(BASE_CONFIG));

      expect(result.injector).toBeDefined();
      result.destroy();
    });

    it('passes the correct options to loadRemoteModule', async () => {
      mockLoad({});
      await firstValueFrom(service.getFederatedModule(BASE_CONFIG));

      expect(loadRemoteModule).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'module',
          remoteEntry: BASE_CONFIG.remoteEntry,
          exposedModule: BASE_CONFIG.exposedModule,
        }),
      );
    });
  });

  // ── caching ─────────────────────────────────────────────────────────────

  describe('getFederatedModule – module cache', () => {
    it('returns the same Observable reference for the same config', () => {
      mockLoad({});
      expect(service.getFederatedModule(BASE_CONFIG)).toBe(service.getFederatedModule(BASE_CONFIG));
    });

    it('calls loadRemoteModule exactly once for repeated subscriptions', async () => {
      mockLoad({});

      const r1 = await firstValueFrom(service.getFederatedModule(BASE_CONFIG));
      const r2 = await firstValueFrom(service.getFederatedModule(BASE_CONFIG));

      expect(loadRemoteModule).toHaveBeenCalledTimes(1);
      expect(r1).toBe(r2);
      r1.destroy();
    });

    it('creates separate cache entries for different remoteEntry values', () => {
      mockLoad({});
      const a = service.getFederatedModule({ ...BASE_CONFIG, remoteEntry: 'http://a.com' });
      const b = service.getFederatedModule({ ...BASE_CONFIG, remoteEntry: 'http://b.com' });
      expect(a).not.toBe(b);
    });

    it('creates separate cache entries for different exposedModule values', () => {
      mockLoad({});
      const a = service.getFederatedModule({ ...BASE_CONFIG, exposedModule: './a' });
      const b = service.getFederatedModule({ ...BASE_CONFIG, exposedModule: './b' });
      expect(a).not.toBe(b);
    });

    it('creates separate cache entries for different moduleName values', () => {
      mockLoad({});
      const a = service.getFederatedModule({ ...BASE_CONFIG, moduleName: 'ModA' });
      const b = service.getFederatedModule({ ...BASE_CONFIG, moduleName: 'ModB' });
      expect(a).not.toBe(b);
    });

    it('shares the cache entry for configs differing only in componentName', () => {
      // componentName is LoadFederatedComponentOptions-only and must not affect the key.
      mockLoad({});
      const a = service.getFederatedModule({ ...BASE_CONFIG } as LoadFederatedModuleOptions);
      const b = service.getFederatedModule({
        ...BASE_CONFIG,
        componentName: 'SomeComp',
      } as unknown as LoadFederatedModuleOptions);
      expect(a).toBe(b);
    });
  });

  // ── destroy evicts cache ─────────────────────────────────────────────────

  describe('getFederatedModule – cache eviction via destroy()', () => {
    it('performs a fresh load after destroy() is called', async () => {
      mockLoad({ components: { First: class {} } });

      const r1 = await firstValueFrom(service.getFederatedModule(BASE_CONFIG));
      r1.destroy();

      mockLoad({ components: { Second: class {} } });
      const r2 = await firstValueFrom(service.getFederatedModule(BASE_CONFIG));

      expect(loadRemoteModule).toHaveBeenCalledTimes(2);
      expect(r2.components).toHaveProperty('Second');
      r2.destroy();
    });

    it('returns a new Observable after destroy()', async () => {
      mockLoad({});

      const r1 = await firstValueFrom(service.getFederatedModule(BASE_CONFIG));
      const obs1 = service.getFederatedModule(BASE_CONFIG);
      r1.destroy();
      const obs2 = service.getFederatedModule(BASE_CONFIG);

      expect(obs1).not.toBe(obs2);
      (await firstValueFrom(obs2)).destroy();
    });
  });

  // ── error eviction ───────────────────────────────────────────────────────

  describe('getFederatedModule – cache eviction on error', () => {
    it('evicts the cache so the next call triggers a fresh load', async () => {
      vi.mocked(loadRemoteModule).mockRejectedValueOnce(new Error('Network error'));

      await expect(
        firstValueFrom(service.getFederatedModule(BASE_CONFIG)),
      ).rejects.toThrow('Network error');

      mockLoad({ components: { Retry: class {} } });
      const r = await firstValueFrom(service.getFederatedModule(BASE_CONFIG));

      expect(loadRemoteModule).toHaveBeenCalledTimes(2);
      expect(r.components).toHaveProperty('Retry');
      r.destroy();
    });

    it('allows recovery from a transient failure on subsequent calls', async () => {
      vi.mocked(loadRemoteModule)
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({ components: { Ok: class {} } });

      await expect(firstValueFrom(service.getFederatedModule(BASE_CONFIG))).rejects.toThrow();
      await expect(firstValueFrom(service.getFederatedModule(BASE_CONFIG))).rejects.toThrow();

      const r = await firstValueFrom(service.getFederatedModule(BASE_CONFIG));
      expect(r.components).toHaveProperty('Ok');
      r.destroy();
    });
  });

  // ── moduleName resolution ────────────────────────────────────────────────

  describe('getFederatedModule – moduleName resolution', () => {
    it('creates an NgModuleRef for a ModuleWithProviders export', async () => {
      mockLoad({ MyModule: { ngModule: RemoteModule, providers: [] } });

      const r = await firstValueFrom(service.getFederatedModule({ ...BASE_CONFIG, moduleName: 'MyModule' }));

      expect(r.ngModuleRef).not.toBeNull();
      r.destroy();
    });

    it('creates an NgModuleRef for a raw @NgModule class export', async () => {
      mockLoad({ RemoteModule });

      const r = await firstValueFrom(service.getFederatedModule({ ...BASE_CONFIG, moduleName: 'RemoteModule' }));

      expect(r.ngModuleRef).not.toBeNull();
      r.destroy();
    });

    it('merges module providers into the injector', async () => {
      mockLoad({ RemoteModule });

      const r = await firstValueFrom(service.getFederatedModule({ ...BASE_CONFIG, moduleName: 'RemoteModule' }));

      // NgModule providers are registered in the NgModuleRef's own injector,
      // not in the parent EnvironmentInjector.
      expect(() => r.ngModuleRef!.injector.get('REMOTE_TOKEN')).not.toThrow();
      r.destroy();
    });

    it('throws when the named export is not a valid NgModule', async () => {
      mockLoad({ BadModule: { notAngular: true } });

      await expect(
        firstValueFrom(service.getFederatedModule({ ...BASE_CONFIG, moduleName: 'BadModule' })),
      ).rejects.toThrow('"BadModule" exported from the remote module is not a valid ModuleWithProviders object');
    });

    it('throws when the named export is absent from the raw module', async () => {
      mockLoad({});

      await expect(
        firstValueFrom(service.getFederatedModule({ ...BASE_CONFIG, moduleName: 'Missing' })),
      ).rejects.toThrow('"Missing" exported from the remote module is not a valid ModuleWithProviders object');
    });

    it('leaves ngModuleRef null when moduleName is not provided', async () => {
      mockLoad({});

      const r = await firstValueFrom(service.getFederatedModule(BASE_CONFIG));

      expect(r.ngModuleRef).toBeNull();
      r.destroy();
    });
  });

  // ── destroy idempotency ─────────────────────────────────────────────────

  describe('FederatedModule.destroy()', () => {
    it('is idempotent — calling it multiple times does not throw', async () => {
      mockLoad({});

      const r = await firstValueFrom(service.getFederatedModule(BASE_CONFIG));

      expect(() => {
        r.destroy();
        r.destroy();
        r.destroy();
      }).not.toThrow();
    });
  });
});
