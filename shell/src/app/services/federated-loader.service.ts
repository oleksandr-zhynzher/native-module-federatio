import {
  ComponentRef,
  EnvironmentInjector,
  Injectable,
  NgModuleRef,
  Type,
  ViewContainerRef,
  createEnvironmentInjector,
  createNgModule,
  inject,
} from '@angular/core';
import { resolveComponentType, resolveModuleType } from '../utils/federated-loader.utils';
import { FederatedModuleFacadeService } from './federated-module-facade.service';

export interface FederatedLoaderConfig {
  remoteEntry: string;
  exposedModule: string;
  componentName?: string;
  moduleName?: string;
}

export interface LoadedFederatedComponent {
  componentName: string;
  componentType: Type<unknown>;
  componentRef: ComponentRef<unknown>;
  moduleRef: NgModuleRef<unknown>;
  ownedInjector: { injector: EnvironmentInjector; destroy(): void };
  destroy(): void;
}

@Injectable({ providedIn: 'root' })
export class FederatedLoaderService {
  private environmentInjector = inject(EnvironmentInjector);
  private moduleFacade = inject(FederatedModuleFacadeService);

  async loadAndMountComponent(
    config: FederatedLoaderConfig,
    viewContainerRef: ViewContainerRef,
  ): Promise<LoadedFederatedComponent | null> {
    if (!config.componentName || !config.moduleName) {
      console.warn('componentName and moduleName are required to mount a component.');
      return null;
    }

    const remoteExports = await this.moduleFacade.loadModule(config);
    if (!remoteExports) return null;

    const componentType = resolveComponentType(remoteExports, config.componentName);
    if (!componentType) return null;

    const moduleTypeResult = resolveModuleType(remoteExports, config.moduleName);
    if (!moduleTypeResult) return null;

    let moduleRef: NgModuleRef<unknown> | undefined;
    let ownedInjector: { injector: EnvironmentInjector; destroy(): void } | undefined;
    let componentRef: ComponentRef<unknown> | undefined;

    try {
      const moduleProviders = moduleTypeResult.providers || [];
      const remoteProviders = remoteExports['providers'] || [];
      const allProviders = [...moduleProviders, ...remoteProviders];

      ownedInjector = this.createOwnedInjector(allProviders);
      moduleRef = createNgModule(moduleTypeResult.ngModule, ownedInjector.injector);

      componentRef = viewContainerRef.createComponent(componentType, {
        ngModuleRef: moduleRef,
        injector: moduleRef.injector,
      });

      return {
        componentName: config.componentName,
        componentType,
        componentRef,
        moduleRef,
        ownedInjector,
        destroy: () => {
          componentRef?.destroy();
          moduleRef?.destroy();
          ownedInjector?.destroy();
        },
      };
    } catch (error) {
      componentRef?.destroy();
      moduleRef?.destroy();
      ownedInjector?.destroy();
      console.warn(`Failed to mount remote component '${config.componentName}'.`, error);
      return null;
    }
  }

  private createOwnedInjector(providers: any[]): {
    injector: EnvironmentInjector;
    destroy(): void;
  } {
    if (!providers || providers.length === 0) {
      return { injector: this.environmentInjector, destroy: () => {} };
    }

    const injector = createEnvironmentInjector(providers, this.environmentInjector);
    return { injector, destroy: () => injector.destroy() };
  }
}
