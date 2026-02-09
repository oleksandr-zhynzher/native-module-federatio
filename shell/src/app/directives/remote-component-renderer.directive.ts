import {
  Directive,
  Input,
  ViewContainerRef,
  inject,
  EnvironmentInjector,
  createEnvironmentInjector,
} from '@angular/core';
import { loadRemoteModule } from '@angular-architects/module-federation';

@Directive({
  selector: '[remoteComponentRenderer]',
  standalone: true,
})
export class RemoteComponentRenderer {
  @Input() remoteEntry!: string;
  @Input() exposedModule!: string;
  @Input() componentName: string = 'App';
  @Input() initializeStore: boolean = false;

  private viewContainerRef = inject(ViewContainerRef);
  private environmentInjector = inject(EnvironmentInjector);

  async loadComponent() {
    try {
      this.viewContainerRef.clear();

      const [publicApi, storeModule] = await Promise.all([
        loadRemoteModule({
          type: 'module',
          remoteEntry: this.remoteEntry,
          exposedModule: this.exposedModule,
        }),
        loadRemoteModule({
          type: 'module',
          remoteEntry: this.remoteEntry,
          exposedModule: this.exposedModule,
        }),
      ]);

      const componentType = publicApi.REMOTE_COMPONENTS?.[this.componentName];

      if (!componentType) {
        console.error(
          `Component '${this.componentName}' not found in remote module. Available components:`,
          Object.keys(publicApi.REMOTE_COMPONENTS || {}),
        );
        return;
      }

      let injectorToUse = this.environmentInjector;

      if (this.initializeStore) {
        const storeProviders = storeModule.provideRemoteStore();
        injectorToUse = createEnvironmentInjector(storeProviders, this.environmentInjector);
      }

      const componentRef = this.viewContainerRef.createComponent(componentType, {
        environmentInjector: injectorToUse,
      });
    } catch (error) {
      console.error('Error loading remote component:', error);
    }
  }
}
