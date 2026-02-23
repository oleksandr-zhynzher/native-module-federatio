import { InjectionToken } from '@angular/core';

export interface UserInsightsConfig {
  title: string;
  defaultInsights: string[];
}

export const USER_INSIGHTS_CONFIG = new InjectionToken<UserInsightsConfig>(
  'USER_INSIGHTS_CONFIG'
);
