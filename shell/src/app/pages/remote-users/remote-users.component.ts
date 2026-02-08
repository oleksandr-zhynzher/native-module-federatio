import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { loadRemoteModule } from '@angular-architects/module-federation';

@Component({
  selector: 'app-remote-users',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mt-5">
      <h2 class="mb-4">Remote Users (Using Remote Service)</h2>
      
      <div *ngIf="loading" class="text-center">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>

      <div *ngIf="error" class="alert alert-danger">
        {{ error }}
      </div>

      <div *ngIf="users.length > 0" class="row">
        <div *ngFor="let user of users" class="col-md-6 col-lg-4 mb-4">
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <h5 class="card-title">{{ user.name }}</h5>
              <h6 class="card-subtitle mb-2 text-muted">@{{ user.username }}</h6>
              <p class="card-text">
                <i class="bi bi-envelope"></i> {{ user.email }}<br>
                <i class="bi bi-telephone"></i> {{ user.phone }}<br>
                <i class="bi bi-globe"></i> {{ user.website }}
              </p>
              <div class="mt-3">
                <small class="text-muted">
                  <strong>{{ user.company.name }}</strong><br>
                  {{ user.company.catchPhrase }}
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card {
      transition: transform 0.2s;
    }
    .card:hover {
      transform: translateY(-5px);
    }
  `]
})
export class RemoteUsersComponent implements OnInit {
  users: any[] = [];
  loading = false;
  error = '';
  
  private usersService: any;
  private httpClient = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  async ngOnInit() {
    console.log('RemoteUsersComponent: ngOnInit started');
    await this.loadRemoteService();
    console.log('RemoteUsersComponent: loadRemoteService completed, usersService:', this.usersService);
    this.loadUsers();
  }

  private async loadRemoteService() {
    try {
      console.log('RemoteUsersComponent: Loading remote service...');
      const serviceModule = await loadRemoteModule({
        type: 'module',
        remoteEntry: 'http://localhost:4300/remoteEntry.js',
        exposedModule: './service',
      });
      
      console.log('RemoteUsersComponent: Service module loaded:', serviceModule);
      console.log('RemoteUsersComponent: Available exports:', Object.keys(serviceModule));
      
      // Create service by passing HttpClient directly
      this.usersService = new serviceModule.UsersService(this.httpClient);
      console.log('RemoteUsersComponent: UsersService created:', this.usersService);
    } catch (err) {
      this.error = 'Failed to load remote service';
      console.error('RemoteUsersComponent: Error loading remote service:', err);
      this.loading = false;
    }
  }

  private loadUsers() {
    console.log('RemoteUsersComponent: loadUsers called, usersService exists:', !!this.usersService);
    
    if (!this.usersService) {
      this.error = 'Service not available';
      console.error('RemoteUsersComponent: Service not available');
      return;
    }

    this.loading = true;
    console.log('RemoteUsersComponent: Calling usersService.getUsers()...');
    
    const users$ = this.usersService.getUsers();
    console.log('RemoteUsersComponent: getUsers() returned:', users$);
    
    users$.subscribe({
      next: (data: any[]) => {
        console.log('RemoteUsersComponent: Users loaded successfully:', data);
        this.users = data;
        this.loading = false;
        console.log('RemoteUsersComponent: users array assigned:', this.users.length, 'items');
        this.cdr.detectChanges();
        console.log('RemoteUsersComponent: change detection triggered');
      },
      error: (err: any) => {
        this.error = 'Failed to load users';
        console.error('RemoteUsersComponent: Error loading users:', err);
        this.loading = false;
      }
    });
  }
}
