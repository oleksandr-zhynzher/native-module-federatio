import {
  EnvironmentInjector,
  EnvironmentProviders,
  Injectable,
  Provider,
  createEnvironmentInjector,
  inject,
} from '@angular/core';

import { RemoteModuleInjector } from '../models';

@Injectable({ providedIn: 'root' })
export class RemoteInjectorFactory {
  private readonly environmentInjector = inject(EnvironmentInjector);

  public create(providers: (Provider | EnvironmentProviders)[]): RemoteModuleInjector {
    const injector = createEnvironmentInjector(providers, this.environmentInjector);
    return {
      injector,
      destroy: (): void => {
        injector.destroy();
      },
    };
  }
}
