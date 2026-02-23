import { Injectable } from '@angular/core';
import { loadRemoteModule } from '@angular-architects/module-federation';
import { FederatedLoaderConfig } from './federated-contract';

export interface RemoteModuleConfig {
  remoteEntry: string;
  exposedModule: string;
}

export type RemoteModuleLoadConfig = Pick<FederatedLoaderConfig, 'remoteEntry' | 'exposedModule'>;

@Injectable({
  providedIn: 'root',
})
export class RemoteModuleLoader {
  async loadRemoteModule(config: RemoteModuleLoadConfig): Promise<Record<string, unknown>> {
    return loadRemoteModule({
      type: 'module',
      remoteEntry: config.remoteEntry,
      exposedModule: config.exposedModule,
    });
  }
}
