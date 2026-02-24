import { RyLoadRemoteModuleOptions } from '../models';

export const defaultFederatedEntryConfig: RyLoadRemoteModuleOptions = {
  type: 'module',
  remoteEntry: 'http://localhost:4300/remoteEntry.js',
  exposedModule: './publicApi',
  componentName: 'AppComponent',
  moduleName: 'ngModule',
};
