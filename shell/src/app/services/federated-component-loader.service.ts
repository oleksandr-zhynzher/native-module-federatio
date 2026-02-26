import { Injectable, Type, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { FederatedModuleFacadeService } from './federated-module-facade.service';
import { LoadFederatedComponentOptions, FederatedModule, ResolvedFederatedComponent } from '../models';

@Injectable({ providedIn: 'root' })
export class FederatedComponentLoaderService {
  private readonly federatedModuleFacade = inject(FederatedModuleFacadeService);

  public getFederatedComponent(
    config: LoadFederatedComponentOptions,
  ): Observable<ResolvedFederatedComponent> {
    return this.federatedModuleFacade.getFederatedModule(config).pipe(
      map((federatedModule) => {
        try {
          return {
            componentType: this.getComponent(federatedModule, config),
            federatedModule,
          };
        } catch (err) {
          federatedModule.destroy();
          throw err;
        }
      }),
    );
  }

  private getComponent(module: FederatedModule, config: LoadFederatedComponentOptions): Type<unknown> {
    const { componentName } = config;
    const component = module.components?.[componentName];

    if (!component) {
      throw new Error(
        `Component "${componentName}" not found in remote module "${config.exposedModule}" at "${config.remoteEntry}". Please ensure it is correctly exported and included in the "components" object.`,
      );
    }

    return component;
  }
}
