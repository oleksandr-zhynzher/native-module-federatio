import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { loadRemoteModule } from '@angular-architects/module-federation';

export interface RemoteServiceConfig {
  remoteEntry: string;
  exposedModule: string;
}

@Injectable({
  providedIn: 'root',
})
export class RemoteServiceLoader {
  private httpClient = inject(HttpClient);

  async loadService<T = any>(
    config: RemoteServiceConfig,
    serviceName: string,
    dependencies: any[] = []
  ): Promise<T> {
    try {
      const serviceModule = await loadRemoteModule({
        type: 'module',
        remoteEntry: config.remoteEntry,
        exposedModule: config.exposedModule,
      });

      const ServiceClass = serviceModule[serviceName];

      if (!ServiceClass) {
        const availableExports = Object.keys(serviceModule);
        throw new Error(
          `Service '${serviceName}' not found in remote module. Available exports: ${availableExports.join(', ')}`,
        );
      }

      // Instantiate service with provided dependencies
      return new ServiceClass(...dependencies) as T;
    } catch (error) {
      console.error(`Error loading remote service '${serviceName}':`, error);
      throw error;
    }
  }

  /**
   * Loads a remote module without instantiating a service
   * Useful for accessing multiple exports from a module
   * @param config Remote module configuration
   * @returns Promise resolving to the module exports
   */
  async loadModule(config: RemoteServiceConfig): Promise<any> {
    try {
      return await loadRemoteModule({
        type: 'module',
        remoteEntry: config.remoteEntry,
        exposedModule: config.exposedModule,
      });
    } catch (error) {
      console.error('Error loading remote module:', error);
      throw error;
    }
  }
}
