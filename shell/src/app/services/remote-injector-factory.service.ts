import {
  EnvironmentInjector,
  Injectable,
  Provider,
  createEnvironmentInjector,
  inject,
} from '@angular/core';

export interface OwnedInjector {
  readonly injector: EnvironmentInjector;
  destroy(): void;
}

@Injectable({ providedIn: 'root' })
export class RemoteInjectorFactory {
  private readonly environmentInjector = inject(EnvironmentInjector);

  create(providers: Provider[]): OwnedInjector {
    const injector = createEnvironmentInjector(providers, this.environmentInjector);
    return { injector, destroy: () => injector.destroy() };
  }
}
