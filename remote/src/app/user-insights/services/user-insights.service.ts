import { Inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { USER_INSIGHTS_CONFIG, UserInsightsConfig } from '../user-insights.config';

@Injectable()
export class UserInsightsService {
  constructor(@Inject(USER_INSIGHTS_CONFIG) private config: UserInsightsConfig) {}

  getInsights(): Observable<string[]> {
    return of(this.config.defaultInsights);
  }
}
