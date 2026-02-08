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
      <p>Click the button below to dynamically load a remote component with NgRx state management.</p>
      
      <button (click)="loadRemoteComponent()">Load Remote Component</button>

      <div class="remote-component-container">
        <h3>Remote Component Container:</h3>
        <ng-container
          remoteComponentRenderer
          [remoteEntry]="'http://localhost:4300/remoteEntry.js'"
          [exposedModule]="'./Component'"
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
    button {
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      font-weight: 500;
      color: white;
      background: #0066cc;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      margin-bottom: 2rem;
    }
    button:hover {
      background: #0052a3;
    }
    .remote-component-container {
      padding: 2rem;
      border: 2px dashed #ccc;
      border-radius: 8px;
      margin-top: 2rem;
    }
  `]
})
export class HomeComponent {
  @ViewChild(RemoteComponentRenderer) remoteComponentRenderer!: RemoteComponentRenderer;

  async loadRemoteComponent() {
    if (this.remoteComponentRenderer) {
      await this.remoteComponentRenderer.loadComponent();
    }
  }
}
