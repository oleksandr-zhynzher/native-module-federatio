import {
  EnvironmentInjector,
  EnvironmentProviders,
  Injectable,
  Provider,
  createEnvironmentInjector,
  inject,
} from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { RemoteModuleConfig, RemoteModuleLoader } from './remote-module-loader.service';

export type FederatedModule = Record<string, unknown> & {
  providers?: (Provider | EnvironmentProviders)[];
};

export interface FederatedOwnedInjector {
  injector: EnvironmentInjector;
  isOwned: boolean;
  destroy(): void;
}

export interface FederatedLoadResult {
  module: FederatedModule;
  ownedInjector: FederatedOwnedInjector;
}

@Injectable({ providedIn: 'root' })
export class FederatedProvidersInjectorService {
  createOwnedInjector(
    federatedModule: FederatedModule,
    injectProviders = true,
  ): FederatedOwnedInjector {
    let destroyed = false;

    if (!injectProviders) {
      return {
        injector: this.environmentInjector,
        isOwned: false,
        destroy: () => {
          destroyed = true;
        },
      };
    }

    const providers = federatedModule?.providers;
    if (!providers || providers.length === 0) {
      return {
        injector: this.environmentInjector,
        isOwned: false,
        destroy: () => {
          destroyed = true;
        },
      };
    }

    const injector = this.injectProviders(federatedModule);
    return {
      injector,
      isOwned: true,
      destroy: () => {
        if (destroyed) {
          return;
        }
        destroyed = true;
        injector.destroy();
      },
    };
  }

  private readonly environmentInjector = inject(EnvironmentInjector);
  injectProviders(federatedModule: FederatedModule): EnvironmentInjector {
    const providers = federatedModule.providers;

    if (!providers || providers.length === 0) {
      return this.environmentInjector;
    }

    return createEnvironmentInjector(providers, this.environmentInjector);
  }

  loadModule$(
    config: RemoteModuleConfig,
    injectProviders = true,
  ): Observable<FederatedLoadResult> {
    return from(this.remoteModuleLoader.loadRemoteModule(config) as Promise<FederatedModule>).pipe(
      map((module) => ({
        module,
        ownedInjector: this.createOwnedInjector(module, injectProviders),
      })),
      catchError((error) => {
        console.warn(`Error during injection of federated module: ${String(error)}`);
        return throwError(() => error);
      }),
    );
  }

  private readonly remoteModuleLoader = inject(RemoteModuleLoader);
}
