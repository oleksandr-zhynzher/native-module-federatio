import {
  createEnvironmentInjector,
  createNgModule,
  EnvironmentInjector,
  inject,
  Injectable,
  ModuleWithProviders,
} from '@angular/core';
import { loadRemoteModule, LoadRemoteModuleOptions } from '@angular-architects/module-federation';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

import {
  LoadFederatedModuleOptions,
  FederatedModule,
  RawFederatedModule,
  MODULE_TYPE_MAP,
} from '../models';
import { isModuleWithProviders, isNgModule } from '../utils';

@Injectable({ providedIn: 'root' })
export class FederatedModuleFacadeService {
  private readonly environmentInjector = inject(EnvironmentInjector);

  /**
   * Keyed by a canonical string derived from the config fields that uniquely
   * identify a remote module. Concurrent or repeated calls with the same config
   * receive the same cached Observable so the remote bundle is loaded only once
   * and a single EnvironmentInjector instance is shared. The entry is evicted
   * when destroy() is called on the resolved FederatedModule.
   */
  private readonly moduleCache = new Map<string, Observable<FederatedModule>>();

  public getFederatedModule(config: LoadFederatedModuleOptions): Observable<FederatedModule> {
    if (!config.remoteEntry) {
      return throwError(() => new Error('getFederatedModule: config.remoteEntry is required'));
    }
    if (!config.exposedModule) {
      return throwError(() => new Error('getFederatedModule: config.exposedModule is required'));
    }
    if (!config.type) {
      return throwError(() => new Error('getFederatedModule: config.type is required'));
    }

    const cacheKey = this.buildCacheKey(config);
    const cached = this.moduleCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const module$ = this.loadFederatedModule(config).pipe(
      map((rawModule) => {
        const federatedModule = this.resolveFederatedModule(rawModule, config);
        const originalDestroy = federatedModule.destroy;
        federatedModule.destroy = () => {
          this.moduleCache.delete(cacheKey);
          originalDestroy();
        };
        return federatedModule;
      }),
      catchError((err) => {
        this.moduleCache.delete(cacheKey);
        return throwError(() => err);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.moduleCache.set(cacheKey, module$);
    return module$;
  }

  private buildCacheKey(config: LoadFederatedModuleOptions): string {
    return [config.type, config.remoteEntry, config.exposedModule, config.moduleName ?? ''].join(
      '::',
    );
  }

  private loadFederatedModule(config: LoadFederatedModuleOptions): Observable<RawFederatedModule> {
    const options = {
      type: MODULE_TYPE_MAP[config.type],
      remoteEntry: config.remoteEntry,
      exposedModule: config.exposedModule,
    } as LoadRemoteModuleOptions;

    return from(loadRemoteModule<RawFederatedModule>(options));
  }

  private resolveFederatedModule(
    module: RawFederatedModule,
    config: LoadFederatedModuleOptions,
  ): FederatedModule {
    const federatedNgModule = config.moduleName
      ? this.resolveNgModule(module, config.moduleName)
      : null;

    const federatedProviders = module.providers ?? [];
    const federatedModuleProviders = federatedNgModule?.providers ?? [];
    const providers = [...federatedModuleProviders, ...federatedProviders];

    const components = module.components ?? null;
    const actions = module.actions ?? null;
    const selectors = module.selectors ?? null;
    const services = module.services ?? null;
    const injector = createEnvironmentInjector(providers, this.environmentInjector);
    const ngModule = federatedNgModule?.ngModule ?? null;
    let ngModuleRef: ReturnType<typeof createNgModule> | null = null;
    try {
      ngModuleRef = ngModule ? createNgModule(ngModule, injector) : null;
    } catch (err) {
      injector.destroy();
      throw err;
    }

    let destroyed = false;

    return {
      components,
      actions,
      selectors,
      services,
      providers,
      injector,
      ngModuleRef,
      destroy: () => {
        if (destroyed) return;
        destroyed = true;
        injector.destroy();
        ngModuleRef?.destroy();
      },
    };
  }

  private resolveNgModule(
    module: RawFederatedModule,
    moduleName: string,
  ): ModuleWithProviders<unknown> {
    const candidate = module[moduleName];

    if (isModuleWithProviders(candidate)) {
      return candidate;
    }

    if (isNgModule(candidate)) {
      return { ngModule: candidate, providers: [] };
    }

    throw new Error(
      `"${moduleName}" exported from the remote module is not a valid ModuleWithProviders object. ` +
        `Ensure the remote exports it as \`{ ngModule: ${moduleName}, providers: [...] }\` ` +
        `or via a static \`forRoot()\` / \`forChild()\` factory rather than a raw NgModule class.`,
    );
  }
}
