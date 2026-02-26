import { inject, Injectable, Type } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';

import { FederatedServiceRef, LoadFederatedModuleOptions } from '../models';
import { FederatedModuleFacadeService } from './federated-module-facade.service';

@Injectable({
  providedIn: 'root',
})
export class FederatedServiceLoaderService {
  private readonly federatedModuleFacadeService = inject(FederatedModuleFacadeService);

  public getRemoteService<T>(
    serviceName: string,
    config: LoadFederatedModuleOptions,
  ): Observable<FederatedServiceRef<T>> {
    if (!serviceName) {
      return throwError(() => new Error('getRemoteService: serviceName is required'));
    }

    return this.federatedModuleFacadeService.getFederatedModule(config).pipe(
      map(({ services, injector, destroy }) => {
        const exported = services?.[serviceName];

        if (!exported) {
          destroy();
          throw new Error(
            `Service "${serviceName}" is not exported from "${config.exposedModule}" at "${config.remoteEntry}".`,
          );
        }

        let serviceRef: T | null;
        try {
          serviceRef = injector.get<T | null>(exported as Type<T>, null);
        } catch (err) {
          destroy();
          throw new Error(
            `Failed to instantiate service "${serviceName}" from "${config.exposedModule}" at "${config.remoteEntry}". ` +
              `Cause: ${err instanceof Error ? err.message : String(err)}`,
          );
        }

        if (serviceRef === null) {
          destroy();
          throw new Error(
            `Service "${serviceName}" from "${config.exposedModule}" at "${config.remoteEntry}" ` +
              `resolved to null. Ensure the service is listed in the remote module's providers.`,
          );
        }

        return { serviceRef, destroy };
      }),
    );
  }
}
