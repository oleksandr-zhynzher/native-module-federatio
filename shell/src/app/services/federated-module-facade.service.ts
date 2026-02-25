import {
  createEnvironmentInjector,
  createNgModule,
  EnvironmentInjector,
  inject,
  Injectable,
  ModuleWithProviders,
} from '@angular/core';
import { loadRemoteModule, LoadRemoteModuleOptions } from '@angular-architects/module-federation';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

import { LoadFederatedModuleOptions, FederatedModule, RawFederatedModule } from '../models';
import { isNgModule, isModuleWithProviders } from '../utils';

@Injectable({ providedIn: 'root' })
export class FederatedModuleFacadeService {
  private readonly environmentInjector = inject(EnvironmentInjector);

  public getFederatedModule(config: LoadFederatedModuleOptions): Observable<FederatedModule> {
    return this.loadFederatedModule(config).pipe(
      map((module) => this.resolveFederatedModule(module, config)),
    );
  }

  private loadFederatedModule(config: LoadFederatedModuleOptions): Observable<RawFederatedModule> {
    const options = {
      type: config.type,
      remoteEntry: config.remoteEntry,
      exposedModule: config.exposedModule,
    } as LoadRemoteModuleOptions;

    return from(loadRemoteModule<RawFederatedModule>(options));
  }

  private resolveFederatedModule(
    module: RawFederatedModule,
    config: LoadFederatedModuleOptions,
  ): FederatedModule {
    const federatedNgModule = this.resolveNgModule(module, config.moduleName ?? '');

    const federatedProviders = module.providers ?? [];
    const federatedModuleProviders = federatedNgModule?.providers ?? [];
    const providers = [...federatedModuleProviders, ...federatedProviders];

    const components = module.components ?? null;
    const actions = module.actions ?? null;
    const selectors = module.selectors ?? null;
    const services = module.services ?? null;
    const injector = createEnvironmentInjector(providers, this.environmentInjector);
    const ngModule = federatedNgModule?.ngModule ?? null;
    const ngModuleRef = ngModule ? createNgModule(ngModule, injector) : null;

    return {
      components,
      actions,
      selectors,
      services,
      providers,
      injector,
      ngModuleRef,
      destroy: () => {
        injector?.destroy();
        ngModuleRef?.destroy();
      },
    };
  }

  private resolveNgModule(
    module: RawFederatedModule,
    moduleName: string,
  ): ModuleWithProviders<unknown> | null {
    if (!moduleName) {
      return null;
    }

    const candidate = module[moduleName];

    if (isModuleWithProviders(candidate)) {
      return candidate;
    }

    if (isNgModule(candidate)) {
      return { ngModule: candidate, providers: [] };
    }

    console.warn(
      `Module "${moduleName}" not found or is not a valid NgModule/ModuleWithProviders. ` +
        `Check if "${moduleName}" is correctly exported from the remote module and matches the expected Angular structure.`,
    );
    return null;
  }
}
