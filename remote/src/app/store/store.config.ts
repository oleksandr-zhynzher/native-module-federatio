import { EnvironmentProviders } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { usersReducer } from './users.reducer';
import { UsersEffects } from './users.effects';
import { UsersService } from '../services/users.service';

/**
 * Provides all NgRx configuration for the remote module.
 * This can be used by the shell to dynamically register the feature state.
 * Note: Provides complete HttpClient setup with Fetch API for the custom injector.
 */
export function provideRemoteStore(): (EnvironmentProviders | any)[] {
  return [
    provideHttpClient(withFetch()),
    UsersService,
    provideState('users', usersReducer),
    provideEffects([UsersEffects])
  ];
}
