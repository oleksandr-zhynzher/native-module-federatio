import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RemoteComponentRenderer } from '../../directives/remote-component-renderer.directive';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RemoteComponentRenderer],
  template: `
    <div class="home-container">
      <h2>Dynamic Component Loading</h2>
      <p>Select a component to dynamically load from the remote module.</p>
      
      <div class="component-selector">
        <button (click)="loadComponent('App')" class="btn-component">
          Load Main App Component
        </button>
        <button (click)="loadComponent('UsersListComponent')" class="btn-component">
          Load Users List
        </button>
        <button (click)="loadComponent('UserProfileComponent')" class="btn-component">
          Load User Profile
        </button>
      </div>

      <div class="remote-component-container">
        <h3>Remote Component Container:</h3>
        <p class="hint">Current component: <strong>{{ currentComponent }}</strong></p>
        <ng-container
          remoteComponentRenderer
          [remoteEntry]="'http://localhost:4300/remoteEntry.js'"
          [exposedModule]="'./public-api'"
          [componentName]="currentComponent"
          [initializeStore]="true"
        >
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    .home-container {
      padding: 2rem;
    }
    h2 {
      font-size: 2rem;
      color: #333;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    h3 {
      color: #666;
      font-size: 1.25rem;
      margin-bottom: 1rem;
    }
    p {
      color: #666;
      margin-bottom: 2rem;
    }
    .component-selector {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
      flex-wrap: wrap;
    }
    button, .btn-component {
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      font-weight: 500;
      color: white;
      background: #0066cc;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    button:hover, .btn-component:hover {
      background: #0052a3;
      transform: translateY(-2px);
    }
    .remote-component-container {
      padding: 2rem;
      border: 2px dashed #ccc;
      border-radius: 8px;
      margin-top: 2rem;
    }
    .hint {
      color: #666;
      font-size: 0.95rem;
      margin-bottom: 1rem;
    }
    .hint strong {
      color: #0066cc;
    }
  `]
})
export class HomeComponent {
  @ViewChild(RemoteComponentRenderer) remoteComponentRenderer!: RemoteComponentRenderer;
  
  currentComponent = 'App';

  async loadComponent(componentName: string) {
    this.currentComponent = componentName;
    // Give Angular time to update the input binding
    await new Promise(resolve => setTimeout(resolve, 0));
    if (this.remoteComponentRenderer) {
      await this.remoteComponentRenderer.loadComponent();
    }
  }
}
