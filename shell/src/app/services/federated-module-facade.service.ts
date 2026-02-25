import { Injectable, ModuleWithProviders } from '@angular/core';
import { loadRemoteModule, LoadRemoteModuleOptions } from '@angular-architects/module-federation';
import { Observable, from, map } from 'rxjs';

import { RyLoadRemoteModuleOptions, RyFederatedModule, RemoteComponentData } from '../models';

@Injectable({ providedIn: 'root' })
export class FederatedModuleFacadeService {
  public getRemoteComponentData(
    config: RyLoadRemoteModuleOptions,
  ): Observable<RemoteComponentData> {
    return this.loadRemoteModule(config).pipe(
      map((remoteModule) => {
        const remoteNgModuleWithProviders = this.getRemoteNgModuleWithProviders(
          remoteModule,
          config,
        );
        const remoteProviders = remoteModule.providers ?? [];
        const moduleProviders = remoteNgModuleWithProviders?.providers ?? [];

        const component = remoteModule.components?.[config.componentName ?? ''] ?? null;
        const ngModule = remoteNgModuleWithProviders?.ngModule ?? null;
        const providers = [...moduleProviders, ...remoteProviders];

        return {
          component,
          ngModule,
          providers,
        };
      }),
    );
  }

  private getRemoteNgModuleWithProviders(
    remoteModule: RyFederatedModule,
    config: RyLoadRemoteModuleOptions,
  ): ModuleWithProviders<unknown> | null {
    if (!config.moduleName) {
      return null;
    }

    const candidate = (remoteModule as Record<string, unknown>)[config.moduleName];

    if (!candidate) {
      return null;
    }

    if (
      typeof candidate === 'object' &&
      'ngModule' in candidate &&
      typeof (candidate as { ngModule: unknown }).ngModule === 'function'
    ) {
      return candidate as ModuleWithProviders<unknown>;
    }

    console.warn(
      `Remote export "${config.moduleName}" is not a valid ModuleWithProviders shape. ` +
        `Expected { ngModule: Type<unknown>, providers?: Provider[] }.`,
    );
    return null;
  }

  public loadRemoteModule(config: RyLoadRemoteModuleOptions): Observable<RyFederatedModule> {
    const options = {
      type: config.type,
      remoteEntry: config.remoteEntry,
      exposedModule: config.exposedModule,
    } as LoadRemoteModuleOptions;

    return from(loadRemoteModule<RyFederatedModule>(options));
  }
}
