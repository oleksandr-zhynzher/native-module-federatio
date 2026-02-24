import { Injectable, ProviderToken } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { defaultFederatedEntryConfig } from '../constants';
import { FederatedProvidersInjectorService } from './federated-providers-injector.service';
import { RyLoadRemoteModuleOptions } from '../models';
import { isProviderToken } from '../utils';

@Injectable({
  providedIn: 'root',
})
export class FederatedServicesInjectorService {
  constructor(private readonly providersInjector: FederatedProvidersInjectorService) {}

  public inject$<T>(
    serviceName: string,
    config: RyLoadRemoteModuleOptions = defaultFederatedEntryConfig,
  ): Observable<T | null> {
    return this.providersInjector.loadModule$(config).pipe(
      map(({ module: federatedModule, injector }) => {
        const exported = federatedModule?.services?.[serviceName];

        if (!exported) {
          console.warn(`Federated service "${serviceName}" not found in remote module`);
          return null;
        }

        if (!isProviderToken(exported)) {
          console.warn(`Federated service "${serviceName}" export is not a valid provider token`);
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
      }),
      catchError((err) => {
        console.warn(`Error during loading federated service "${serviceName}": ${String(err)}`);
        return of(null);
      }),
    );
  }
}
