import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { LoadFederatedModuleOptions } from '../models';
import { FederatedModuleFacadeService } from './federated-module-facade.service';

@Injectable({
  providedIn: 'root',
})
export class FederatedServiceLoaderService {
  private readonly federatedModuleFacadeService = inject(FederatedModuleFacadeService);

  public getRemoteService<T>(
    serviceName: string,
    config: LoadFederatedModuleOptions,
  ): Observable<T | null> {
    if (!serviceName) {
      throw new Error('getRemoteService: serviceName is required');
    }

    return this.federatedModuleFacadeService.getFederatedModule(config).pipe(
      map(({ services, injector }) => {
        const exported = services?.[serviceName];

        if (!exported) {
          console.warn(
            `Service "${serviceName}" not found in remote module "${config.exposedModule}" at "${config.remoteEntry}". ` +
              `Ensure it is included in the "services" object exported by the remote.`,
          );
          return null;
        }

        try {
          const instance = injector.get(exported, null);
          if (instance) return instance as T;
          console.warn(
            `Service "${serviceName}" from "${config.exposedModule}" resolved to null or undefined using the provided injector.`,
          );
          return null;
        } catch (err) {
          console.warn(
            `Failed to instantiate federated service "${serviceName}" from "${config.exposedModule}":`,
            err,
          );
          return null;
        }
      }),
      catchError((err) => {
        console.warn(
          `Error loading federated module for service "${serviceName}" from "${config.remoteEntry}":`,
          err,
        );
        return of(null);
      }),
    );
  }
}
