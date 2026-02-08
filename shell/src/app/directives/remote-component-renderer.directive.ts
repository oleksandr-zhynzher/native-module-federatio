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

  private viewContainerRef = inject(ViewContainerRef);
  private environmentInjector = inject(EnvironmentInjector);

  async loadComponent() {
    try {
      this.viewContainerRef.clear();
      
      // Load the component and store configuration in parallel
      const [componentModule, storeModule] = await Promise.all([
        loadRemoteModule({
          type: 'module',
          remoteEntry: this.remoteEntry,
          exposedModule: this.exposedModule,
        }),
        loadRemoteModule({
          type: 'module',
          remoteEntry: this.remoteEntry,
          exposedModule: './store',
        })
      ]);
      
      const componentType = componentModule.App;
      
      if (!componentType) {
        console.error(`Component not found in module`);
        return;
      }

      // Get the store providers from the remote module
      const storeProviders = storeModule.provideRemoteStore();

      // Create a custom environment injector with the remote's feature state
      // The parent injector provides HttpClient and other shared services
      const customInjector = createEnvironmentInjector(
        storeProviders,
        this.environmentInjector
      );

      const componentRef = this.viewContainerRef.createComponent(componentType, {
        environmentInjector: customInjector,
      });
      
      console.log('Remote component loaded successfully', componentRef);
    } catch (error) {
      console.error('Error loading remote component:', error);
    }
  }
}
