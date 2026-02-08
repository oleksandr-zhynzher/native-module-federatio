import { Injectable, ComponentFactory, ComponentFactoryResolver, Type } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class RemoteModuleLoader {
  constructor(private _componentFactoryResolver: ComponentFactoryResolver) {}

  async loadRemoteModule(name: string) {
    const [scope, moduleName] = name.split('/');
    
    // Wait for the remote container to be available
    await this.loadRemoteContainer(scope);
    
    // Get the module factory from the remote container
    const container = (window as any)[scope];
    const moduleFactory = await container.get('./' + moduleName);
    return moduleFactory();
  }

  private async loadRemoteContainer(scope: string): Promise<void> {
    // The remote container is loaded by webpack module federation
    // This just waits for it to be available
    return new Promise((resolve, reject) => {
      const checkContainer = () => {
        if ((window as any)[scope]) {
          resolve();
        } else {
          setTimeout(checkContainer, 50);
        }
      };
      checkContainer();
    });
  }

  getComponentFactory(component: Type<unknown>): ComponentFactory<unknown> {
    return this._componentFactoryResolver.resolveComponentFactory(component);
  }
}
