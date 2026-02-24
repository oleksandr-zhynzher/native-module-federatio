import {
  Injectable,
  NgModuleRef,
  Type,
  ViewContainerRef,
  createNgModule,
  inject,
} from '@angular/core';
import { Observable, map, throwError } from 'rxjs';
import {
  RemoteNgModuleDescriptor,
  resolveComponentType,
  resolveModuleType,
} from '../utils/federated-loader.utils';
import { FederatedModuleFacadeService } from './federated-module-facade.service';
import { OwnedInjector, RemoteInjectorFactory } from './remote-injector-factory.service';

export interface FederatedLoaderConfig {
  remoteEntry: string;
  exposedModule: string;
  componentName?: string;
  moduleName?: string;
}

export interface MountedComponent {
  readonly componentName: string;
  setInput(key: string, value: unknown): void;
  destroy(): void;
}

interface ResolvedRemoteTypes {
  componentType: Type<unknown>;
  moduleDescriptor: RemoteNgModuleDescriptor;
}

@Injectable({ providedIn: 'root' })
export class FederatedLoaderService {
  private readonly moduleFacade = inject(FederatedModuleFacadeService);
  private readonly injectorFactory = inject(RemoteInjectorFactory);

  loadAndMountComponent(
    config: FederatedLoaderConfig,
    viewContainerRef: ViewContainerRef,
  ): Observable<MountedComponent> {
    if (!config.componentName || !config.moduleName) {
      return throwError(() => new Error('componentName and moduleName are required to mount a component.'));
    }

    return this.resolveRemoteTypes(config, config.componentName, config.moduleName).pipe(
      map((resolved) => this.mountComponent(config.componentName!, resolved, viewContainerRef)),
    );
  }

  private resolveRemoteTypes(
    config: FederatedLoaderConfig,
    componentName: string,
    moduleName: string,
  ): Observable<ResolvedRemoteTypes> {
    return this.moduleFacade.loadModule(config).pipe(
      map((remoteExports) => {
        const componentType = resolveComponentType(remoteExports, componentName);
        if (!componentType) {
          throw new Error(`Component '${componentName}' not found or is not a valid Angular component.`);
        }

        const moduleDescriptor = resolveModuleType(remoteExports, moduleName);
        if (!moduleDescriptor) {
          throw new Error(`Module '${moduleName}' not found in remote exports.`);
        }

        return { componentType, moduleDescriptor };
      }),
    );
  }

  private mountComponent(
    componentName: string,
    { componentType, moduleDescriptor }: ResolvedRemoteTypes,
    viewContainerRef: ViewContainerRef,
  ): MountedComponent {
    let moduleRef: NgModuleRef<unknown> | undefined;
    let ownedInjector: OwnedInjector | undefined;

    try {
      ownedInjector = this.injectorFactory.create([...(moduleDescriptor.providers ?? [])]);
      moduleRef = createNgModule(moduleDescriptor.ngModule, ownedInjector.injector);

      const componentRef = viewContainerRef.createComponent(componentType, {
        ngModuleRef: moduleRef,
      });

      return {
        componentName,
        setInput: (key: string, value: unknown) => componentRef.setInput(key, value),
        destroy: () => {
          componentRef.destroy();
          moduleRef?.destroy();
          ownedInjector?.destroy();
        },
      };
    } catch (error) {
      moduleRef?.destroy();
      ownedInjector?.destroy();
      throw error;
    }
  }
}
