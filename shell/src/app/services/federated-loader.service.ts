import { Injectable, NgModuleRef, ViewContainerRef, createNgModule, inject } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';

import { FederatedModuleFacadeService } from './federated-module-facade.service';
import { RemoteInjectorFactory } from './remote-injector-factory.service';
import {
  RemoteComponentRef,
  RemoteComponentData,
  RyLoadRemoteModuleOptions,
  RemoteModuleInjector,
} from '../models';

@Injectable({ providedIn: 'root' })
export class FederatedComponentLoaderService {
  private readonly injectorFactory = inject(RemoteInjectorFactory);
  private readonly moduleFacade = inject(FederatedModuleFacadeService);

  public getRemoteComponent(
    config: RyLoadRemoteModuleOptions,
    viewContainerRef: ViewContainerRef,
  ): Observable<RemoteComponentRef> {
    if (!config.componentName) {
      return throwError(() => new Error('componentName is required to mount a component.'));
    }

    return this.moduleFacade
      .getRemoteComponentData(config)
      .pipe(
        map((componentData) =>
          this.createComponentInstance(componentData, config, viewContainerRef),
        ),
      );
  }

  private createComponentInstance(
    { component, ngModule, providers }: RemoteComponentData,
    config: RyLoadRemoteModuleOptions,
    viewContainerRef: ViewContainerRef,
  ): RemoteComponentRef {
    let moduleRef: NgModuleRef<unknown> | undefined;
    let remoteModuleInjector: RemoteModuleInjector | undefined;

    if (!component) {
      throw new Error(
        `Component '${config.componentName ?? ''}' not found or is not a valid Angular component.`,
      );
    }

    try {
      remoteModuleInjector = this.injectorFactory.create(providers);

      if (ngModule) {
        moduleRef = createNgModule(ngModule, remoteModuleInjector.injector);
      }

      const componentRef = viewContainerRef.createComponent(component, {
        ngModuleRef: moduleRef,
        injector: !moduleRef ? remoteModuleInjector.injector : undefined,
      });

      return {
        componentRef,
        destroy: (): void => {
          componentRef.destroy();
          moduleRef?.destroy();
          remoteModuleInjector?.destroy();
        },
      };
    } catch (error) {
      moduleRef?.destroy();
      remoteModuleInjector?.destroy();
      throw error;
    }
  }
}
