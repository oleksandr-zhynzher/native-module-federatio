import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RemoteServiceLoader } from '../../services/remote-service-loader.service';

@Component({
  selector: 'app-users-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mt-5">
      <h2 class="mb-4">Users Table (Remote Service)</h2>

      <div *ngIf="loading" class="text-center my-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2">Loading users from remote service...</p>
      </div>

      <div *ngIf="error" class="alert alert-danger" role="alert">
        <i class="bi bi-exclamation-triangle"></i> {{ error }}
      </div>

      <div *ngIf="!loading && users.length > 0" class="table-responsive">
        <table class="table table-hover table-striped">
          <thead class="table-dark">
            <tr>
              <th scope="col">#</th>
              <th scope="col">Name</th>
              <th scope="col">Username</th>
              <th scope="col">Email</th>
              <th scope="col">Phone</th>
              <th scope="col">Company</th>
              <th scope="col">Website</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of users; let i = index" class="user-row">
              <th scope="row">{{ i + 1 }}</th>
              <td>
                <strong>{{ user.name }}</strong>
              </td>
              <td>
                <span class="badge bg-secondary">@{{ user.username }}</span>
              </td>
              <td>
                <a [href]="'mailto:' + user.email" class="text-decoration-none">
                  <i class="bi bi-envelope"></i> {{ user.email }}
                </a>
              </td>
              <td>
                <i class="bi bi-telephone"></i> {{ user.phone }}
              </td>
              <td>
                <div>
                  <strong>{{ user.company.name }}</strong>
                  <br />
                  <small class="text-muted">{{ user.company.catchPhrase }}</small>
                </div>
              </td>
              <td>
                <a [href]="'https://' + user.website" target="_blank" class="text-decoration-none">
                  <i class="bi bi-globe"></i> {{ user.website }}
                </a>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="mt-3">
          <p class="text-muted">
            <i class="bi bi-info-circle"></i> Total users loaded: <strong>{{ users.length }}</strong>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .user-row {
        transition: background-color 0.2s;
      }

      .user-row:hover {
        background-color: rgba(0, 123, 255, 0.1) !important;
      }

      .table {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .badge {
        font-weight: normal;
      }
    `,
  ],
})
export class UsersTableComponent implements OnInit {
  users: any[] = [];
  loading = false;
  error = '';

  private remoteServiceLoader = inject(RemoteServiceLoader);
  private httpClient = inject(HttpClient);

  async ngOnInit() {
    await this.loadUsers();
  }

  private async loadUsers() {
    this.loading = true;
    this.error = '';

    try {
      // Load remote service
      const usersService = await this.remoteServiceLoader.loadService(
        {
          remoteEntry: 'http://localhost:4300/remoteEntry.js',
          exposedModule: './service',
        },
        'UsersService',
        [this.httpClient]
      );

      // Fetch users data
      usersService.getUsers().subscribe({
        next: (data: any[]) => {
          this.users = data;
          this.loading = false;
        },
        error: (err: any) => {
          this.error = 'Failed to load users from remote service';
          console.error('Error loading users:', err);
          this.loading = false;
        },
      });
    } catch (err) {
      this.error = 'Failed to load remote service';
      console.error('Error loading remote service:', err);
      this.loading = false;
    }
  }
}
