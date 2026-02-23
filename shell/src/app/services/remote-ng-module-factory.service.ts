import { Injectable, Injector, NgModuleRef, Type, createNgModule } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RemoteNgModuleFactoryService {
  createNgModuleRef(moduleType: Type<unknown>, parentInjector?: Injector): NgModuleRef<unknown> {
    return parentInjector ? createNgModule(moduleType, parentInjector) : createNgModule(moduleType);
  }
}
