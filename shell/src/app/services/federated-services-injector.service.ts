import { Injectable, ProviderToken } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { RemoteModuleConfig } from './remote-module-loader.service';
import {
  FederatedOwnedInjector,
  FederatedProvidersInjectorService,
} from './federated-providers-injector.service';

export interface FederatedServiceHandle<T> {
  service: T;
  ownedInjector: FederatedOwnedInjector;
  destroy(): void;
}

@Injectable({ providedIn: 'root' })
export class FederatedServicesInjectorService {
  constructor(private readonly providersInjector: FederatedProvidersInjectorService) {}

  inject$<T>(
    serviceName: string,
    config: RemoteModuleConfig,
  ): Observable<FederatedServiceHandle<T> | null> {
    return this.providersInjector.loadModule$(config).pipe(
      map((loadResult) => {
        if (!loadResult) {
          return null;
        }

        const { module: federatedModule, ownedInjector } = loadResult;
        const exported = federatedModule[serviceName];

        if (!exported) {
          ownedInjector.destroy();
          console.warn(`Federated service '${serviceName}' not found in remote module`);
          return null;
        }

        if (!this.isProviderToken(exported)) {
          ownedInjector.destroy();
          console.warn(
            `Federated service '${serviceName}' export is not a valid provider token`,
            exported,
          );
          return null;
        }

        try {
          const service = ownedInjector.injector.get(exported as ProviderToken<T>, null);

          if (service === null) {
            ownedInjector.destroy();
            console.warn(
              `Provider for federated service '${serviceName}' is not registered in the remote injector.`,
            );
            return null;
          }

          return {
            service,
            ownedInjector,
            destroy: () => {
              ownedInjector.destroy();
            },
          };
        } catch (error) {
          ownedInjector.destroy();
          console.warn(`Failed to instantiate federated service '${serviceName}'.`, error);
          return null;
        }
      }),
      catchError((error) => {
        console.warn(`Error during loading federated service '${serviceName}'.`, error);
        return of(null);
      }),
    );
  }

  private isProviderToken(token: unknown): token is ProviderToken<unknown> {
    return typeof token === 'function' || (typeof token === 'object' && token !== null);
  }
}
