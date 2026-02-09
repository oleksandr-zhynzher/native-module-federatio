import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RemoteServiceLoader } from '../../services/remote-service-loader.service';

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
                <i class="bi bi-envelope"></i> {{ user.email }}<br />
                <i class="bi bi-telephone"></i> {{ user.phone }}<br />
                <i class="bi bi-globe"></i> {{ user.website }}
              </p>
              <div class="mt-3">
                <small class="text-muted">
                  <strong>{{ user.company.name }}</strong
                  ><br />
                  {{ user.company.catchPhrase }}
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .card {
        transition: transform 0.2s;
      }
      .card:hover {
        transform: translateY(-5px);
      }
    `,
  ],
})
export class RemoteUsersComponent implements OnInit {
  users: any[] = [];
  loading = false;
  error = '';

  private usersService: any;
  private remoteServiceLoader = inject(RemoteServiceLoader);
  private httpClient = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  async ngOnInit() {
    await this.loadRemoteService();
    this.loadUsers();
  }

  private async loadRemoteService() {
    try {
      this.usersService = await this.remoteServiceLoader.loadService(
        {
          remoteEntry: 'http://localhost:4300/remoteEntry.js',
          exposedModule: './service',
        },
        'UsersService',
        [this.httpClient]
      );
    } catch (err) {
      this.error = 'Failed to load remote service';
      console.error('Error loading remote service:', err);
      this.loading = false;
    }
  }

  private loadUsers() {
    if (!this.usersService) {
      return;
    }

    this.loading = true;

    this.usersService.getUsers().subscribe({
      next: (data: any[]) => {
        this.users = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }
}
