import { InjectionToken } from '@angular/core';

export interface UsersModuleConfig {
  title: string;
  subtitle: string;
  autoLoadOnInit: boolean;
}

export const USERS_MODULE_CONFIG = new InjectionToken<UsersModuleConfig>(
  'USERS_MODULE_CONFIG'
);
