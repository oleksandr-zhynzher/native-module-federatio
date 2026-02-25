import { ComponentRef, Injectable, Type, ViewContainerRef, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { FederatedModuleFacadeService } from './federated-module-facade.service';
import { LoadFederatedModuleOptions, FederatedModule, FederatedComponentRef } from '../models';

@Injectable({ providedIn: 'root' })
export class FederatedComponentLoaderService {
  private readonly federatedModuleFacade = inject(FederatedModuleFacadeService);

  public getFederatedComponent(
    config: LoadFederatedModuleOptions,
    viewContainerRef: ViewContainerRef,
  ): Observable<FederatedComponentRef> {
    return this.federatedModuleFacade.getFederatedModule(config).pipe(
      map((federatedModule) => {
        const component = this.getComponent(federatedModule, config);
        return this.createComponentInstance(component, federatedModule, viewContainerRef);
      }),
    );
  }

  private createComponentInstance(
    component: Type<unknown>,
    federatedModule: FederatedModule,
    viewContainerRef: ViewContainerRef,
  ): FederatedComponentRef {
    const { ngModuleRef, injector } = federatedModule;
    const componentRef = viewContainerRef.createComponent(component, {
      ngModuleRef: ngModuleRef ?? undefined,
      injector,
    });

    return {
      componentRef,
      destroyFederatedModuleRef: () => {
        federatedModule.destroy();
      },
    };
  }

  private getComponent(module: FederatedModule, config: LoadFederatedModuleOptions): Type<unknown> {
    if (!config.componentName) {
      throw new Error('getComponent: config.componentName is required');
    }

    const componentName = config.componentName;
    const component = module.components?.[componentName];

    if (!component) {
      throw new Error(
        `Component "${componentName}" not found in remote module "${config.exposedModule}" at "${config.remoteEntry}". Please ensure it is correctly exported and included in the "components" object.`,
      );
    }

    return component;
  }
}
