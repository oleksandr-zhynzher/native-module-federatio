import { inject, Injector, runInInjectionContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UsersService } from './users.service';

/**
 * Factory function to create UsersService with proper dependency injection.
 * This can be called from the shell app to get a properly initialized service instance.
 */
export function createUsersService(injector: Injector): UsersService {
  return runInInjectionContext(injector, () => {
    const httpClient = inject(HttpClient);
    return new UsersService(httpClient);
  });
}

/**
 * Alternative: Export the service class and let consumers handle DI
 */
export { UsersService };
