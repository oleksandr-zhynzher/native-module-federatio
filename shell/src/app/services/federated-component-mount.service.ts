import {
  ComponentRef,
  Injectable,
  NgModuleRef,
  Type,
  ViewContainerRef,
} from '@angular/core';
import {
  FederatedOwnedInjector,
  FederatedModule,
  FederatedProvidersInjectorService,
} from './federated-providers-injector.service';
import {
  FederatedComponentFacadeService,
  ResolvedFederatedConfig,
} from './federated-component-facade.service';
import { FederatedExportsResolverService } from './federated-exports-resolver.service';
import { RemoteNgModuleFactoryService } from './remote-ng-module-factory.service';

export interface LoadedFederatedComponent {
  componentName: string;
  componentType: Type<unknown>;
  componentRef: ComponentRef<unknown>;
  moduleRef: NgModuleRef<unknown>;
  ownedInjector: FederatedOwnedInjector;
  destroy(): void;
}

@Injectable({ providedIn: 'root' })
export class FederatedComponentMountService {
  constructor(
    private readonly facade: FederatedComponentFacadeService,
    private readonly exportsResolver: FederatedExportsResolverService,
    private readonly remoteNgModuleFactory: RemoteNgModuleFactoryService,
    private readonly providersInjector: FederatedProvidersInjectorService,
  ) {}

  async loadAndMountComponent(
    resolved: ResolvedFederatedConfig,
    viewContainerRef: ViewContainerRef,
  ): Promise<LoadedFederatedComponent | null> {
    const remoteExportsResult = await this.facade.loadRemoteExports(resolved);
    if (!remoteExportsResult) {
      return null;
    }

    const remoteExports = remoteExportsResult;

    const componentTypeResult = this.exportsResolver.resolveComponentType(
      remoteExports,
      resolved.componentName,
    );
    if (!componentTypeResult) {
      return null;
    }

    const moduleTypeResult = this.exportsResolver.resolveModuleType(
      remoteExports,
      resolved.moduleName,
    );
    if (!moduleTypeResult) {
      return null;
    }

    let moduleRef: NgModuleRef<unknown> | undefined;
    let ownedInjector: FederatedOwnedInjector | undefined;
    let componentRef: ComponentRef<unknown> | undefined;

    try {
      const moduleProviders = moduleTypeResult.providers || [];

      const injectorResult = this.providersInjector.createOwnedInjectorWithModuleProviders(
        remoteExports as FederatedModule,
        moduleProviders,
      );
      if (!injectorResult) {
        return null;
      }

      ownedInjector = injectorResult;

      moduleRef = this.remoteNgModuleFactory.createNgModuleRef(
        moduleTypeResult.ngModule,
        ownedInjector.injector,
      );

      componentRef = viewContainerRef.createComponent(componentTypeResult, {
        ngModuleRef: moduleRef,
        injector: moduleRef.injector,
      });
    } catch (error) {
      componentRef?.destroy();
      moduleRef?.destroy();
      ownedInjector?.destroy();

      console.warn(
        `Failed to mount remote component '${resolved.componentName}' from '${resolved.exposedModule}'.`,
        error,
      );
      return null;
    }

    if (!componentRef || !moduleRef || !ownedInjector) {
      console.warn(
        `Failed to mount remote component '${resolved.componentName}' from '${resolved.exposedModule}'.`,
      );
      return null;
    }

    return {
      componentName: resolved.componentName,
      componentType: componentTypeResult,
      componentRef,
      moduleRef,
      ownedInjector,
      destroy: () => {
        componentRef?.destroy();
        moduleRef?.destroy();
        ownedInjector?.destroy();
      },
    };
  }
}