import { Injectable, EnvironmentInjector, createEnvironmentInjector, inject } from '@angular/core';
import { loadRemoteModule } from '@angular-architects/module-federation';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { RyFederatedModule, RyLoadRemoteModuleOptions } from '../models';

export interface FederatedLoadResult {
  module: RyFederatedModule;
  injector: EnvironmentInjector;
}

@Injectable({ providedIn: 'root' })
export class FederatedProvidersInjectorService {
  private readonly environmentInjector = inject(EnvironmentInjector);

  public injectProviders(federatedModule: RyFederatedModule): EnvironmentInjector {
    const providers = federatedModule?.providers;

    if (!providers) {
      return this.environmentInjector;
    }

    return createEnvironmentInjector(providers, this.environmentInjector);
  }

  public loadModule$(
    config: RyLoadRemoteModuleOptions,
    injectProviders = true,
  ): Observable<FederatedLoadResult> {
    return from(loadRemoteModule<RyFederatedModule>(config)).pipe(
      map((module) => ({
        module,
        injector: injectProviders ? this.injectProviders(module) : this.environmentInjector,
      })),
      catchError((err) => {
        console.warn(`Error during injection of federated module: ${String(err)}`);
        return throwError(() => err);
      }),
    );
  }
}
