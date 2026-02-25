import { FederatedModuleType, LoadFederatedModuleOptions } from '../models';

export const defaultFederatedEntryConfig: LoadFederatedModuleOptions = {
  type: FederatedModuleType.Module,
  remoteEntry: 'http://localhost:4300/remoteEntry.js',
  exposedModule: './publicApi',
  componentName: 'AppComponent',
  moduleName: 'ngModule',
};
