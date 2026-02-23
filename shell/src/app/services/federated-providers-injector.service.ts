import {
  EnvironmentInjector,
  EnvironmentProviders,
  Injectable,
  Provider,
  createEnvironmentInjector,
  inject,
} from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { isValidProvidersArray } from './federated-contract';
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
  createOwnedInjectorWithModuleProviders(
    remoteExports: FederatedModule,
    moduleProviders: (Provider | EnvironmentProviders)[] = [],
  ): FederatedOwnedInjector | null {
    const providersToInject: (Provider | EnvironmentProviders)[] = [
      ...moduleProviders,
      ...(remoteExports.providers ?? []),
    ];

    if (providersToInject.length === 0) {
      return this.createOwnedInjector(remoteExports);
    }

    if (!isValidProvidersArray(providersToInject)) {
      console.warn(
        'Remote module exported invalid providers format. Expected an array of Provider or EnvironmentProviders.',
        { providers: providersToInject },
      );
      return null;
    }

    return this.createOwnedInjector({
      ...remoteExports,
      providers: providersToInject,
    });
  }

  createOwnedInjector(federatedModule: FederatedModule): FederatedOwnedInjector {
    let destroyed = false;

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

    const injector = this.createInjectorFromProviders(federatedModule.providers);
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
  private createInjectorFromProviders(
    providers: (Provider | EnvironmentProviders)[] | undefined,
  ): EnvironmentInjector {
    if (!providers || providers.length === 0) {
      return this.environmentInjector;
    }

    return createEnvironmentInjector(providers, this.environmentInjector);
  }

  loadModule$(config: RemoteModuleConfig): Observable<FederatedLoadResult | null> {
    return from(this.remoteModuleLoader.loadRemoteModule(config) as Promise<FederatedModule>).pipe(
      map((module) => {
        if (module.providers && !isValidProvidersArray(module.providers)) {
          console.warn(
            'Remote module exported invalid providers format. Expected an array of Provider or EnvironmentProviders.',
            { providers: module.providers },
          );
          return null;
        }

        return {
          module,
          ownedInjector: this.createOwnedInjector(module),
        };
      }),
      catchError((error) => {
        console.warn(`Error during injection of federated module: ${String(error)}`);
        console.warn(
          `Failed to load remote module from '${config.remoteEntry}' and '${config.exposedModule}'.`,
          error,
        );
        return of(null);
      }),
    );
  }

  private readonly remoteModuleLoader = inject(RemoteModuleLoader);
}
