import { createReducer, on } from '@ngrx/store';
import { User } from '../services/users.service';
import * as UsersActions from './users.actions';

export interface UsersState {
  users: User[];
  selectedUser: User | null;
  loading: boolean;
  error: string | null;
}

export const initialState: UsersState = {
  users: [],
  selectedUser: null,
  loading: false,
  error: null,
};

export const usersReducer = createReducer(
  initialState,
  
  // Load Users
  on(UsersActions.loadUsers, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  
  on(UsersActions.loadUsersSuccess, (state, { users }) => ({
    ...state,
    users,
    loading: false,
    error: null,
  })),
  
  on(UsersActions.loadUsersFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  
  // Load Single User
  on(UsersActions.loadUser, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  
  on(UsersActions.loadUserSuccess, (state, { user }) => ({
    ...state,
    selectedUser: user,
    loading: false,
    error: null,
  })),
  
  on(UsersActions.loadUserFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  }))
);
