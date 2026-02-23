import { Component, Inject, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { User } from '../../services/users.service';
import * as UsersActions from '../../store/users.actions';
import * as UsersSelectors from '../../store/users.selectors';
import { USERS_MODULE_CONFIG, UsersModuleConfig } from '../users.config';

@Component({
  selector: 'app-users-list',
  standalone: false,
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.css',
})
export class UsersListComponent implements OnInit {
  users$: Observable<User[]>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  selectedUser$: Observable<User | null>;

  constructor(
    private store: Store,
    @Inject(USERS_MODULE_CONFIG) public config: UsersModuleConfig
  ) {
    this.users$ = this.store.select(UsersSelectors.selectAllUsers);
    this.loading$ = this.store.select(UsersSelectors.selectUsersLoading);
    this.error$ = this.store.select(UsersSelectors.selectUsersError);
    this.selectedUser$ = this.store.select(UsersSelectors.selectSelectedUser);
  }

  ngOnInit(): void {
    if (this.config.autoLoadOnInit) {
      this.loadUsers();
    }
  }

  loadUsers(): void {
    this.store.dispatch(UsersActions.loadUsers());
  }

  selectUser(id: number): void {
    this.store.dispatch(UsersActions.loadUser({ id }));
  }
}
