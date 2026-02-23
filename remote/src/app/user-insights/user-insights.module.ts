import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { MatCardModule } from '@angular/material/card';
import { UserInsightsComponent } from './components/user-insights.component';
import { userInsightsReducer } from './store/user-insights.reducer';
import { UserInsightsEffects } from './store/user-insights.effects';
import { UserInsightsService } from './services/user-insights.service';
import { USER_INSIGHTS_CONFIG, UserInsightsConfig } from './user-insights.config';

@NgModule({
  declarations: [UserInsightsComponent],
  imports: [
    CommonModule,
    MatCardModule,
  ],
  providers: [
    provideState('userInsights', userInsightsReducer),
    provideEffects([UserInsightsEffects]),
  ],
  exports: [UserInsightsComponent],
})
export class UserInsightsModule {
  static forRoot(config: UserInsightsConfig): ModuleWithProviders<UserInsightsModule> {
    return {
      ngModule: UserInsightsModule,
      providers: [
        UserInsightsService,
        {
          provide: USER_INSIGHTS_CONFIG,
          useValue: config,
        },
      ],
    };
  }
}
