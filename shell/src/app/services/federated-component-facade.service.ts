import { Injectable } from '@angular/core';
import { RemoteModuleLoader } from './remote-module-loader.service';

export interface ResolvedFederatedConfig {
  remoteEntry: string;
  exposedModule: string;
  componentName: string;
  moduleName: string;
}

@Injectable({ providedIn: 'root' })
export class FederatedComponentFacadeService {
  constructor(private readonly remoteModuleLoader: RemoteModuleLoader) {}

  async loadRemoteExports(resolved: ResolvedFederatedConfig): Promise<Record<string, unknown> | null> {
    let remoteExports: Record<string, unknown>;
    try {
      remoteExports = await this.remoteModuleLoader.loadRemoteModule({
        remoteEntry: resolved.remoteEntry,
        exposedModule: resolved.exposedModule,
      });
    } catch (error) {
      console.warn(
        `Failed to load remote module from '${resolved.remoteEntry}' and '${resolved.exposedModule}'.`,
        error,
      );
      return null;
    }

    return remoteExports;
  }
}
