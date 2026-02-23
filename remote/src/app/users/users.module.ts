import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UsersListComponent } from './components/users-list.component';
import { UsersService } from '../services/users.service';
import { UsersEffects } from '../store/users.effects';
import { usersReducer } from '../store/users.reducer';
import { USERS_MODULE_CONFIG, UsersModuleConfig } from './users.config';
import { UserInsightsModule } from '../user-insights/user-insights.module';
import { USER_INSIGHTS_CONFIG } from '../user-insights/user-insights.config';
import { UserInsightsService } from '../user-insights/services/user-insights.service';

@NgModule({
  declarations: [UsersListComponent],
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    UserInsightsModule,
  ],
  providers: [
    provideState('users', usersReducer),
    provideEffects([UsersEffects]),
    UserInsightsService,
    {
      provide: USER_INSIGHTS_CONFIG,
      useValue: {
        title: 'Module Showcase Insights',
        defaultInsights: [
          'forRoot config is injected with @Inject token',
          'Feature store is registered with StoreModule.forFeature',
          'Effects are isolated inside the module',
        ],
      },
    },
  ],
  exports: [UsersListComponent],
})
export class UsersModule {
  static forRoot(config: UsersModuleConfig): ModuleWithProviders<UsersModule> {
    return {
      ngModule: UsersModule,
      providers: [UsersService, { provide: USERS_MODULE_CONFIG, useValue: config }],
    };
  }
}
