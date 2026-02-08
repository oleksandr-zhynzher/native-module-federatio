import { createAction, props } from '@ngrx/store';
import { User } from '../services/users.service';

// Load Users Actions
export const loadUsers = createAction('[Users] Load Users');

export const loadUsersSuccess = createAction(
  '[Users] Load Users Success',
  props<{ users: User[] }>()
);

export const loadUsersFailure = createAction(
  '[Users] Load Users Failure',
  props<{ error: string }>()
);

// Load Single User Actions
export const loadUser = createAction(
  '[Users] Load User',
  props<{ id: number }>()
);

export const loadUserSuccess = createAction(
  '[Users] Load User Success',
  props<{ user: User }>()
);

export const loadUserFailure = createAction(
  '[Users] Load User Failure',
  props<{ error: string }>()
);
