import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import * as UsersActions from './store/users.actions';
import * as UsersSelectors from './store/users.selectors';
import { User } from './services/users.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private store = inject(Store);
  
  users$: Observable<User[]> = this.store.select(UsersSelectors.selectAllUsers);
  loading$: Observable<boolean> = this.store.select(UsersSelectors.selectUsersLoading);
  error$: Observable<string | null> = this.store.select(UsersSelectors.selectUsersError);
  selectedUser$: Observable<User | null> = this.store.select(UsersSelectors.selectSelectedUser);

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.store.dispatch(UsersActions.loadUsers());
  }

  selectUser(id: number) {
    this.store.dispatch(UsersActions.loadUser({ id }));
  }
}
