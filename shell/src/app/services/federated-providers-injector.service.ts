import { Injectable, EnvironmentInjector, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { RyFederatedModule, RyLoadRemoteModuleOptions } from '../models';
import { FederatedModuleFacadeService } from './federated-module-facade.service';
import { RemoteInjectorFactory } from './remote-injector-factory.service';

export interface FederatedLoadResult {
  module: RyFederatedModule;
  injector: EnvironmentInjector;
}

@Injectable({ providedIn: 'root' })
export class FederatedProvidersInjectorService {
  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly moduleFacade = inject(FederatedModuleFacadeService);
  private readonly injectorFactory = inject(RemoteInjectorFactory);

  public injectProviders(federatedModule: RyFederatedModule): EnvironmentInjector {
    const providers = federatedModule?.providers;

    if (!providers?.length) {
      return this.environmentInjector;
    }

    return this.injectorFactory.create(providers).injector;
  }

  public getRemoteModule(
    config: RyLoadRemoteModuleOptions,
    injectProviders = true,
  ): Observable<FederatedLoadResult> {
    return this.moduleFacade.loadRemoteModule(config).pipe(
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
