import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { UsersService } from '../services/users.service';
import * as UsersActions from './users.actions';

@Injectable()
export class UsersEffects {
  private actions$ = inject(Actions);
  private usersService = inject(UsersService);

  loadUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UsersActions.loadUsers),
      switchMap(() =>
        this.usersService.getUsers().pipe(
          map((users) => UsersActions.loadUsersSuccess({ users })),
          catchError((error) =>
            of(UsersActions.loadUsersFailure({ error: error.message }))
          )
        )
      )
    )
  );

  loadUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UsersActions.loadUser),
      switchMap(({ id }) =>
        this.usersService.getUserById(id).pipe(
          map((user) => UsersActions.loadUserSuccess({ user })),
          catchError((error) =>
            of(UsersActions.loadUserFailure({ error: error.message }))
          )
        )
      )
    )
  );
}
