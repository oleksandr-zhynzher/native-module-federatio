import { EnvironmentInjector, Injectable, ProviderToken, inject } from '@angular/core';
import { Observable, of, map } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { defaultFederatedEntryConfig } from '../constants';
import { FederatedProvidersInjectorService } from './federated-providers-injector.service';
import { RemoteServiceRef, RyFederatedModule, RyLoadRemoteModuleOptions } from '../models';

@Injectable({
  providedIn: 'root',
})
export class FederatedServicesInjectorService {
  private readonly providersInjector = inject(FederatedProvidersInjectorService);

  public getRemoteService<T>(
    serviceName: string,
    config: RyLoadRemoteModuleOptions = defaultFederatedEntryConfig,
  ): Observable<RemoteServiceRef<T | null> | null> {
    return this.providersInjector.getRemoteModule(config).pipe(
      map(({ module: federatedModule, injector }) => ({
        service: this.resolveService<T>(serviceName, federatedModule, injector),
      })),
      catchError((err) => {
        console.warn(`Error during loading federated service "${serviceName}": ${String(err)}`);
        return of(null);
      }),
    );
  }

  private resolveService<T>(
    serviceName: string,
    federatedModule: RyFederatedModule,
    injector: EnvironmentInjector,
  ): T | null {
    const exported = federatedModule?.services?.[serviceName];

    if (!exported) {
      console.warn(`Federated service "${serviceName}" not found in remote module`);
      return null;
    }

    try {
      const instance = injector.get(exported as ProviderToken<unknown>, null);
      if (instance) return instance as T;
      console.warn(`Federated service "${serviceName}" resolved to null or undefined`);
      return null;
    } catch (err) {
      console.warn(`Failed to instantiate federated service "${serviceName}": ${String(err)}`);
      return null;
    }
  }
}
