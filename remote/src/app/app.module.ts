import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { UsersModule } from './users/users.module';

@NgModule({
  declarations: [App],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    UsersModule.forRoot({
      title: '🚀 Remote Module with NgRx',
      subtitle: 'Full State Management Flow: Actions → Effects → Reducers → Selectors',
      autoLoadOnInit: true,
    }),
  ],
  providers: [provideHttpClient(withFetch())],
  bootstrap: [App],
})
export class AppModule {}
