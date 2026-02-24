import { Injectable } from '@angular/core';
import { loadRemoteModule } from '@angular-architects/module-federation';
import { Observable, from } from 'rxjs';
import { FederatedLoaderConfig } from './federated-loader.service';

@Injectable({ providedIn: 'root' })
export class FederatedModuleFacadeService {
  loadModule(
    config: Pick<FederatedLoaderConfig, 'remoteEntry' | 'exposedModule'>,
  ): Observable<Record<string, unknown>> {
    return from(
      loadRemoteModule({
        type: 'module',
        remoteEntry: config.remoteEntry,
        exposedModule: config.exposedModule,
      }),
    );
  }
}
