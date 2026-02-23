import {
  Directive,
  EventEmitter,
  effect,
  input,
  OnDestroy,
  Output,
  ViewContainerRef,
  inject,
} from '@angular/core';
import {
  FederatedComponentMountService,
  LoadedFederatedComponent,
} from '../services/federated-component-mount.service';
import { FederatedLoaderConfig } from '../services/federated-contract';

@Directive({
  selector: '[appDynamicFederatedLoader]',
})
export class RemoteComponentRenderer implements OnDestroy {
  private componentMountService = inject(FederatedComponentMountService);
  private viewContainerRef = inject(ViewContainerRef);

  public readonly componentInputs = input<Record<string, unknown>>({});
  public readonly config = input<FederatedLoaderConfig | null>(null);

  @Output() public readonly destroyedEvent = new EventEmitter<boolean>();
  @Output() public readonly loadedEvent = new EventEmitter<boolean>();

  private destroyed = false;
  private loadRequestId = 0;
  private activeConfigKey: string | null = null;
  private mountedComponent?: LoadedFederatedComponent;

  constructor() {
    this.setupConfigEffect();
    this.setupInputsEffect();
  }

  private setupConfigEffect(): void {
    effect(() => {
      const resolved = this.config();
      const configKey = this.createConfigKey(resolved);

      if (!resolved || !configKey) {
        this.handleInvalidConfig();
        return;
      }

      if (configKey === this.activeConfigKey) {
        return;
      }

      this.activeConfigKey = configKey;
      void this.loadComponent(resolved);
    });
  }

  private setupInputsEffect(): void {
    effect(() => {
      this.componentInputs();
      this.applyInputs();
    });
  }

  public ngOnDestroy(): void {
    this.destroyed = true;
    this.loadRequestId += 1;

    if (this.mountedComponent) {
      this.destroyedEvent.emit(true);
    }

    this.cleanup();
  }

  private handleInvalidConfig(): void {
    this.activeConfigKey = null;
    this.cleanup();
    this.emitLoadFailure();
  }

  private applyInputs(): void {
    if (!this.mountedComponent?.componentRef) {
      return;
    }

    for (const [key, value] of Object.entries(this.componentInputs())) {
      try {
        this.mountedComponent.componentRef.setInput(key, value);
      } catch (error) {
        console.error(error);

        console.warn(
          `Failed to set input '${key}' on component '${this.mountedComponent.componentName}':`,
          error,
        );
      }
    }
  }

  private cleanup(): void {
    this.mountedComponent?.destroy();
    this.viewContainerRef.clear();
    this.mountedComponent = undefined;
  }

  private createConfigKey(config: FederatedLoaderConfig | null): string | null {
    if (!config) {
      return null;
    }

    if (!config.remoteEntry || !config.exposedModule || !config.componentName || !config.moduleName) {
      return null;
    }

    return `${config.remoteEntry}::${config.exposedModule}::${config.componentName}::${config.moduleName}`;
  }

  private async loadComponent(resolved: FederatedLoaderConfig): Promise<void> {
    const requestId = ++this.loadRequestId;

    this.cleanup();

    try {
      const loaded = await this.componentMountService.loadAndMountComponent(
        resolved,
        this.viewContainerRef,
      );

      if (this.destroyed || requestId !== this.loadRequestId) {
        if (loaded) {
          loaded.destroy();
        }
        return;
      }

      if (!loaded) {
        this.emitLoadFailure();
        console.warn(
          `Failed to load remote component '${resolved.componentName}' from '${resolved.exposedModule}'.`,
        );
        return;
      }

      this.mountedComponent = loaded;

      this.applyInputs();
      this.loadedEvent.emit(true);
    } catch (error) {
      if (this.destroyed || requestId !== this.loadRequestId) {
        return;
      }

      this.emitLoadFailure();
      console.error(error);
      console.warn(
        `Failed to load remote component '${resolved.componentName}' from '${resolved.exposedModule}':`,
        error,
      );
    }
  }

  private emitLoadFailure(): void {
    this.loadedEvent.emit(false);
  }
}
