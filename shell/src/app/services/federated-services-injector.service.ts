import { Injectable, ProviderToken } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { errorResult, okResult, Result } from './federated-contract';
import { RemoteModuleConfig } from './remote-module-loader.service';
import {
  FederatedOwnedInjector,
  FederatedProvidersInjectorService,
} from './federated-providers-injector.service';

export interface FederatedServiceHandle<T> {
  service: T | null;
  ownedInjector: FederatedOwnedInjector;
  destroy(): void;
}

@Injectable({ providedIn: 'root' })
export class FederatedServicesInjectorService {
  constructor(private readonly providersInjector: FederatedProvidersInjectorService) {}

  inject$<T>(
    serviceName: string,
    config: RemoteModuleConfig,
    injectProviders = true,
  ): Observable<Result<FederatedServiceHandle<T>>> {
    return this.providersInjector.loadModule$(config, injectProviders).pipe(
      map(({ module: federatedModule, ownedInjector }) => {
        const exported = federatedModule?.[serviceName];

        if (!exported) {
          ownedInjector.destroy();
          return errorResult({
            code: 'SERVICE_NOT_FOUND',
            message: `Federated service '${serviceName}' not found in remote module`,
          });
        }

        if (!this.isProviderToken(exported)) {
          ownedInjector.destroy();
          return errorResult({
            code: 'INVALID_SERVICE_EXPORT',
            message: `Federated service '${serviceName}' export is not a valid provider token`,
          });
        }

        try {
          const service = ownedInjector.injector.get(exported as ProviderToken<T>, null);

          return okResult({
            service,
            ownedInjector,
            destroy: () => ownedInjector.destroy(),
          });
        } catch (error) {
          ownedInjector.destroy();
          return errorResult({
            code: 'SERVICE_INSTANTIATION_FAILED',
            message: `Failed to instantiate federated service '${serviceName}'.`,
            cause: error,
          });
        }
      }),
      catchError((error) => {
        return of(
          errorResult({
            code: 'LOAD_FAILED',
            message: `Error during loading federated service '${serviceName}'.`,
            cause: error,
          }),
        );
      }),
    );
  }

  private isProviderToken(token: unknown): token is ProviderToken<unknown> {
    return typeof token === 'function' || (typeof token === 'object' && token !== null);
  }
}
