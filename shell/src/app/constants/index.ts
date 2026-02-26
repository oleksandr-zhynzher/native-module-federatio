import { FederatedModuleType, LoadFederatedComponentOptions } from '../models';

export const defaultFederatedEntryConfig: LoadFederatedComponentOptions = {
  type: FederatedModuleType.Module,
  remoteEntry: 'http://localhost:4300/remoteEntry.js',
  exposedModule: './publicApi',
  componentName: 'AppComponent',
  moduleName: 'ngModule',
};
