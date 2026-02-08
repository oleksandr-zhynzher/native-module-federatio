import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { RemoteUsersComponent } from './pages/remote-users/remote-users.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'remote-users',
    component: RemoteUsersComponent
  }
];
