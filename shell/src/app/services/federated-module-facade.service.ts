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
    const moduleDescriptor = (remoteModule as Record<string, unknown>)[
      config.moduleName ?? ''
    ] as ModuleWithProviders<unknown> | null;
    return moduleDescriptor;
  }

  private loadRemoteModule(config: RyLoadRemoteModuleOptions): Observable<RyFederatedModule> {
    const options = {
      type: config.type,
      remoteEntry: config.remoteEntry,
      exposedModule: config.exposedModule,
    } as LoadRemoteModuleOptions;

    return from(loadRemoteModule<RyFederatedModule>(options));
  }
}
