import { Component, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RemoteComponentRenderer } from './directives/remote-component-renderer.directive';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RemoteComponentRenderer],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('shell');

  @ViewChild(RemoteComponentRenderer) remoteRenderer!: RemoteComponentRenderer;

  async loadRemoteComponent() {
    if (this.remoteRenderer) {
      await this.remoteRenderer.loadComponent();
    }
  }
}
