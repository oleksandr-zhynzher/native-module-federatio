import { Component, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { firstValueFrom } from 'rxjs';

import { FederatedComponentLoaderService } from './federated-component-loader.service';
import { FederatedModuleFacadeService } from './federated-module-facade.service';
import {
  FederatedModule,
  FederatedModuleType,
  LoadFederatedComponentOptions,
} from '../models';

@Component({ standalone: true, selector: 'test-remote', template: '' })
class RemoteComponent {}

function makeModule(
  overrides: Partial<Pick<FederatedModule, 'components' | 'services' | 'actions' | 'selectors'>>,
): FederatedModule {
  return {
    components: null,
    services: null,
    actions: null,
    selectors: null,
    providers: [],
    injector: TestBed.inject(EnvironmentInjector),
    ngModuleRef: null,
    destroy: vi.fn(),
    ...overrides,
  };
}

const BASE_CONFIG: LoadFederatedComponentOptions = {
  type: FederatedModuleType.Module,
  remoteEntry: 'http://localhost:4300/remoteEntry.js',
  exposedModule: './public-api',
  componentName: 'RemoteComponent',
};

describe('FederatedComponentLoaderService', () => {
  let service: FederatedComponentLoaderService;
  let facadeMock: { getFederatedModule: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    facadeMock = { getFederatedModule: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        FederatedComponentLoaderService,
        { provide: FederatedModuleFacadeService, useValue: facadeMock },
      ],
    });

    service = TestBed.inject(FederatedComponentLoaderService);
  });

  afterEach(() => TestBed.resetTestingModule());

  // ── happy path ──────────────────────────────────────────────────────────

  describe('getFederatedComponent – success', () => {
    it('resolves with the matching component type', async () => {
      const module = makeModule({ components: { RemoteComponent } });
      facadeMock.getFederatedModule.mockReturnValue(of(module));

      const result = await firstValueFrom(service.getFederatedComponent(BASE_CONFIG));

      expect(result.componentType).toBe(RemoteComponent);
    });

    it('resolves with the full FederatedModule reference', async () => {
      const module = makeModule({ components: { RemoteComponent } });
      facadeMock.getFederatedModule.mockReturnValue(of(module));

      const result = await firstValueFrom(service.getFederatedComponent(BASE_CONFIG));

      expect(result.federatedModule).toBe(module);
    });

    it('forwards the config object to the facade unchanged', async () => {
      const module = makeModule({ components: { RemoteComponent } });
      facadeMock.getFederatedModule.mockReturnValue(of(module));

      await firstValueFrom(service.getFederatedComponent(BASE_CONFIG));

      expect(facadeMock.getFederatedModule).toHaveBeenCalledWith(BASE_CONFIG);
    });
  });

  // ── component not found ─────────────────────────────────────────────────

  describe('getFederatedComponent – component not found', () => {
    it('throws an error describing the missing component', async () => {
      const module = makeModule({ components: {} });
      facadeMock.getFederatedModule.mockReturnValue(of(module));

      await expect(
        firstValueFrom(service.getFederatedComponent(BASE_CONFIG)),
      ).rejects.toThrow('Component "RemoteComponent" not found');
    });

    it('includes the remoteEntry and exposedModule in the error message', async () => {
      const module = makeModule({ components: {} });
      facadeMock.getFederatedModule.mockReturnValue(of(module));

      await expect(
        firstValueFrom(service.getFederatedComponent(BASE_CONFIG)),
      ).rejects.toThrow(BASE_CONFIG.remoteEntry);
    });

    it('calls destroy() on the module when the component is not found', async () => {
      const module = makeModule({ components: {} });
      facadeMock.getFederatedModule.mockReturnValue(of(module));

      await firstValueFrom(service.getFederatedComponent(BASE_CONFIG)).catch(() => {});

      expect(module.destroy).toHaveBeenCalledTimes(1);
    });

    it('calls destroy() when the components map is null', async () => {
      const module = makeModule({ components: null });
      facadeMock.getFederatedModule.mockReturnValue(of(module));

      await firstValueFrom(service.getFederatedComponent(BASE_CONFIG)).catch(() => {});

      expect(module.destroy).toHaveBeenCalledTimes(1);
    });
  });

  // ── facade error propagation ─────────────────────────────────────────────

  describe('getFederatedComponent – facade errors', () => {
    it('propagates errors from getFederatedModule', async () => {
      facadeMock.getFederatedModule.mockReturnValue(
        throwError(() => new Error('Remote unavailable')),
      );

      await expect(
        firstValueFrom(service.getFederatedComponent(BASE_CONFIG)),
      ).rejects.toThrow('Remote unavailable');
    });

    it('does not call destroy() when the facade itself errors', async () => {
      const destroySpy = vi.fn();
      // facade errors before a module is returned — no destroy to call
      facadeMock.getFederatedModule.mockReturnValue(
        throwError(() => new Error('load failed')),
      );

      await firstValueFrom(service.getFederatedComponent(BASE_CONFIG)).catch(() => {});

      expect(destroySpy).not.toHaveBeenCalled();
    });
  });

  // ── correct config mapping ───────────────────────────────────────────────

  describe('getFederatedComponent – config propagation', () => {
    it('uses componentName from config to select from the components map', async () => {
      class AltComponent {}
      const module = makeModule({ components: { AltComponent } });
      facadeMock.getFederatedModule.mockReturnValue(of(module));
      const config: LoadFederatedComponentOptions = { ...BASE_CONFIG, componentName: 'AltComponent' };

      const result = await firstValueFrom(service.getFederatedComponent(config));

      expect(result.componentType).toBe(AltComponent);
    });
  });
});
