import { Injectable } from '@angular/core';
import { loadRemoteModule } from '@angular-architects/module-federation';
import { FederatedLoaderConfig } from './federated-loader.service';

@Injectable({ providedIn: 'root' })
export class FederatedModuleFacadeService {
  private moduleCache = new Map<string, Promise<Record<string, any>>>();

  async loadModule(
    config: Pick<FederatedLoaderConfig, 'remoteEntry' | 'exposedModule'>,
  ): Promise<Record<string, any> | null> {
    const cacheKey = `${config.remoteEntry}::${config.exposedModule}`;

    if (!this.moduleCache.has(cacheKey)) {
      const request = loadRemoteModule({
        type: 'module',
        remoteEntry: config.remoteEntry,
        exposedModule: config.exposedModule,
      }).catch((error) => {
        this.moduleCache.delete(cacheKey);
        return Promise.reject(error);
      });

      this.moduleCache.set(cacheKey, request);
    }

    try {
      return await this.moduleCache.get(cacheKey)!;
    } catch (error) {
      console.warn(
        `Failed to load remote module from '${config.remoteEntry}' and '${config.exposedModule}'.`,
        error,
      );
      return null;
    }
  }

  clearCache(config?: Pick<FederatedLoaderConfig, 'remoteEntry' | 'exposedModule'>): void {
    if (config) {
      this.moduleCache.delete(`${config.remoteEntry}::${config.exposedModule}`);
    } else {
      this.moduleCache.clear();
    }
  }
}
