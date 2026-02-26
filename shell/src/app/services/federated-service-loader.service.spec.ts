import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { firstValueFrom } from 'rxjs';

import { FederatedServiceLoaderService } from './federated-service-loader.service';
import { FederatedModuleFacadeService } from './federated-module-facade.service';
import {
  FederatedModule,
  FederatedModuleType,
  LoadFederatedModuleOptions,
} from '../models';

// ─── test fixtures ────────────────────────────────────────────────────────────

@Injectable()
class TestService {
  readonly value = 'real-service';
}

function makeModule(
  services: FederatedModule['services'],
  injectorGet: (token: unknown) => unknown = () => null,
): FederatedModule {
  return {
    components: null,
    services,
    actions: null,
    selectors: null,
    providers: [],
    injector: { get: vi.fn(injectorGet) } as unknown as FederatedModule['injector'],
    ngModuleRef: null,
    destroy: vi.fn(),
  };
}

const BASE_CONFIG: LoadFederatedModuleOptions = {
  type: FederatedModuleType.Module,
  remoteEntry: 'http://localhost:4300',
  exposedModule: './public-api',
};

// ─── suite ────────────────────────────────────────────────────────────────────

describe('FederatedServiceLoaderService', () => {
  let service: FederatedServiceLoaderService;
  let facadeMock: { getFederatedModule: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    facadeMock = { getFederatedModule: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        FederatedServiceLoaderService,
        { provide: FederatedModuleFacadeService, useValue: facadeMock },
      ],
    });

    service = TestBed.inject(FederatedServiceLoaderService);
  });

  afterEach(() => TestBed.resetTestingModule());

  // ── validation ──────────────────────────────────────────────────────────

  describe('getRemoteService – serviceName validation', () => {
    it('rejects immediately when serviceName is an empty string', async () => {
      await expect(
        firstValueFrom(service.getRemoteService('', BASE_CONFIG)),
      ).rejects.toThrow('getRemoteService: serviceName is required');
    });

    it('does not call getFederatedModule when serviceName is empty', async () => {
      await firstValueFrom(service.getRemoteService('', BASE_CONFIG)).catch(() => {});
      expect(facadeMock.getFederatedModule).not.toHaveBeenCalled();
    });
  });

  // ── happy path ──────────────────────────────────────────────────────────

  describe('getRemoteService – success', () => {
    it('returns the service instance from the injector', async () => {
      const instance = new TestService();
      const module = makeModule({ TestService }, () => instance);
      facadeMock.getFederatedModule.mockReturnValue(of(module));

      const result = await firstValueFrom(
        service.getRemoteService<TestService>('TestService', BASE_CONFIG),
      );

      expect(result.serviceRef).toBe(instance);
    });

    it('returns the destroy handle from the module', async () => {
      const instance = new TestService();
      const module = makeModule({ TestService }, () => instance);
      facadeMock.getFederatedModule.mockReturnValue(of(module));

      const result = await firstValueFrom(
        service.getRemoteService<TestService>('TestService', BASE_CONFIG),
      );

      expect(typeof result.destroy).toBe('function');
    });

    it('forwards the config to getFederatedModule', async () => {
      const instance = new TestService();
      const module = makeModule({ TestService }, () => instance);
      facadeMock.getFederatedModule.mockReturnValue(of(module));

      await firstValueFrom(service.getRemoteService('TestService', BASE_CONFIG));

      expect(facadeMock.getFederatedModule).toHaveBeenCalledWith(BASE_CONFIG);
    });
  });

  // ── service not exported ─────────────────────────────────────────────────

  describe('getRemoteService – service not in exports', () => {
    it('throws when the requested service is absent from the services map', async () => {
      const module = makeModule({});
      facadeMock.getFederatedModule.mockReturnValue(of(module));

      await expect(
        firstValueFrom(service.getRemoteService('MissingService', BASE_CONFIG)),
      ).rejects.toThrow('Service "MissingService" is not exported');
    });

    it('calls destroy() when the service is absent', async () => {
      const module = makeModule({});
      facadeMock.getFederatedModule.mockReturnValue(of(module));

      await firstValueFrom(service.getRemoteService('MissingService', BASE_CONFIG)).catch(() => {});

      expect(module.destroy).toHaveBeenCalledTimes(1);
    });

    it('throws when the services map is null', async () => {
      const module = makeModule(null);
      facadeMock.getFederatedModule.mockReturnValue(of(module));

      await expect(
        firstValueFrom(service.getRemoteService('AnyService', BASE_CONFIG)),
      ).rejects.toThrow('is not exported');

      expect(module.destroy).toHaveBeenCalledTimes(1);
    });
  });

  // ── instantiation failure ────────────────────────────────────────────────

  describe('getRemoteService – DI instantiation error', () => {
    it('wraps the underlying DI error in a descriptive message', async () => {
      const module = makeModule({ TestService }, () => {
        throw new Error('Circular dependency detected');
      });
      facadeMock.getFederatedModule.mockReturnValue(of(module));

      await expect(
        firstValueFrom(service.getRemoteService('TestService', BASE_CONFIG)),
      ).rejects.toThrow('Failed to instantiate service "TestService"');
    });

    it('includes the original error cause in the message', async () => {
      const module = makeModule({ TestService }, () => {
        throw new Error('original cause');
      });
      facadeMock.getFederatedModule.mockReturnValue(of(module));

      await expect(
        firstValueFrom(service.getRemoteService('TestService', BASE_CONFIG)),
      ).rejects.toThrow('original cause');
    });

    it('calls destroy() when instantiation throws', async () => {
      const module = makeModule({ TestService }, () => {
        throw new Error('DI failure');
      });
      facadeMock.getFederatedModule.mockReturnValue(of(module));

      await firstValueFrom(service.getRemoteService('TestService', BASE_CONFIG)).catch(() => {});

      expect(module.destroy).toHaveBeenCalledTimes(1);
    });
  });

  // ── null service resolution ──────────────────────────────────────────────

  describe('getRemoteService – injector returns null', () => {
    it('throws when the injector resolves the token to null', async () => {
      const module = makeModule({ TestService }, () => null);
      facadeMock.getFederatedModule.mockReturnValue(of(module));

      await expect(
        firstValueFrom(service.getRemoteService('TestService', BASE_CONFIG)),
      ).rejects.toThrow('resolved to null');
    });

    it('calls destroy() when the service resolves to null', async () => {
      const module = makeModule({ TestService }, () => null);
      facadeMock.getFederatedModule.mockReturnValue(of(module));

      await firstValueFrom(service.getRemoteService('TestService', BASE_CONFIG)).catch(() => {});

      expect(module.destroy).toHaveBeenCalledTimes(1);
    });
  });

  // ── facade errors ────────────────────────────────────────────────────────

  describe('getRemoteService – facade errors', () => {
    it('propagates errors from getFederatedModule upstream', async () => {
      facadeMock.getFederatedModule.mockReturnValue(
        throwError(() => new Error('bundle not found')),
      );

      await expect(
        firstValueFrom(service.getRemoteService('AnyService', BASE_CONFIG)),
      ).rejects.toThrow('bundle not found');
    });
  });
});
