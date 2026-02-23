import {
  Directive,
  EventEmitter,
  Injector,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChange,
  ViewContainerRef,
  inject,
} from '@angular/core';
import {
  FederatedComponentFacadeService,
  LoadedFederatedComponent,
  ResolvedFederatedConfig,
} from '../services/federated-component-facade.service';
import { FederatedLoaderConfigInput } from '../services/federated-contract';

type ComponentChanges<T extends object> = Partial<Record<keyof T, SimpleChange>>;

@Directive({
  selector: '[appDynamicFederatedLoader]',
})
export class RemoteComponentRenderer implements OnInit, OnChanges, OnDestroy {
  private facade = inject(FederatedComponentFacadeService);
  private injector = inject(Injector);
  private viewContainerRef = inject(ViewContainerRef);

  @Input() declare public componentInputs: Record<string, unknown>;
  @Input() declare public config: FederatedLoaderConfigInput;
  @Input() declare public injectProviders: boolean;

  @Output() public readonly destroyedEvent = new EventEmitter<boolean>();
  @Output() public readonly loadedEvent = new EventEmitter<boolean>();

  private initialized = false;
  private mountedComponent?: LoadedFederatedComponent;

  public ngOnInit(): void {
    void this.loadComponent();
  }

  public ngOnChanges(changes: ComponentChanges<RemoteComponentRenderer>): void {
    if (!this.initialized) {
      return;
    }

    if (changes.componentInputs && !changes.componentInputs.firstChange) {
      this.applyInputs();
    }
  }

  public ngOnDestroy(): void {
    if (this.mountedComponent) {
      this.destroyedEvent.emit(true);
    }
    this.cleanup();
  }

  private applyInputs(): void {
    if (!this.mountedComponent?.componentRef) {
      return;
    }

    for (const [key, value] of Object.entries(this.componentInputs || {})) {
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

  private async loadComponent(): Promise<void> {
    const resolved = this.resolveConfig();

    this.cleanup();

    if (
      !resolved.remoteEntry ||
      !resolved.exposedModule ||
      !resolved.componentName ||
      !resolved.moduleName
    ) {
      this.loadedEvent.emit(false);
      return;
    }

    try {
      const loaded = await this.facade.loadAndMountComponent(
        resolved,
        this.injector,
        this.viewContainerRef,
      );
      if (!loaded.ok) {
        this.loadedEvent.emit(false);
        const loadError = (loaded as { ok: false; error: { cause?: unknown; message?: string } })
          .error;

        console.log(loadError.cause);

        console.warn(
          `Failed to load remote component '${resolved.componentName}' from '${resolved.exposedModule}': ${loadError.message ?? ''}`,
          loadError,
        );
        return;
      }

      this.mountedComponent = loaded.value;

      this.applyInputs();
      this.initialized = true;
      this.loadedEvent.emit(true);
    } catch (error) {
      this.loadedEvent.emit(false);
      console.error(error);
      console.warn(
        `Failed to load remote component '${resolved.componentName}' from '${resolved.exposedModule}':`,
        error,
      );
    }
  }

  private resolveConfig(): ResolvedFederatedConfig {
    return this.facade.resolveConfig(this.config, {
      remoteEntry: '',
      exposedModule: './public-api',
      componentName: 'App',
      moduleName: 'ngModule',
      injectProviders: this.injectProviders,
    });
  }
}
