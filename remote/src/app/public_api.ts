import { App } from './app';
import { UsersListComponent } from './components/users-list.component';
import { UserProfileComponent } from './components/user-profile.component';

export { App } from './app';
export { UsersListComponent } from './components/users-list.component';
export { UserProfileComponent } from './components/user-profile.component';

// Services
export { UsersService } from './services/users.service';

// Store
export { provideRemoteStore } from './store/store.config';
export * from './store/users.actions';
export * from './store/users.selectors';
export * from './store/users.reducer';

/**
 * Component registry for dynamic loading
 * Maps component names to their constructors
 */
export const REMOTE_COMPONENTS = {
  App: App,
  UsersListComponent: UsersListComponent,
  UserProfileComponent: UserProfileComponent,
} as const;

export type RemoteComponentName = keyof typeof REMOTE_COMPONENTS;
