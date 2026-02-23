import {
  Directive,
  EventEmitter,
  Injector,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewContainerRef,
  inject,
} from '@angular/core';
import {
  FederatedComponentFacadeService,
  LoadedFederatedComponent,
  ResolvedFederatedConfig,
} from '../services/federated-component-facade.service';
import { FederatedLoaderConfigInput } from '../services/federated-contract';

@Directive({
  selector: '[remoteComponentRenderer], [appDynamicFederatedLoader]',
})
export class RemoteComponentRenderer implements OnInit, OnChanges, OnDestroy {
  @Input() config?: FederatedLoaderConfigInput;
  @Input() componentInputs: Record<string, unknown> = {};
  @Input() injectProviders = false;

  @Output() loadedEvent = new EventEmitter<boolean>();
  @Output() destroyedEvent = new EventEmitter<boolean>();

  private viewContainerRef = inject(ViewContainerRef);
  private injector = inject(Injector);
  private facade = inject(FederatedComponentFacadeService);

  private mountedComponent?: LoadedFederatedComponent;
  private initialized = false;

  ngOnInit(): void {
    this.initialized = true;
    void this.loadComponent();
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (!this.initialized) {
      return;
    }

    if (changes['componentInputs'] && !changes['componentInputs'].firstChange) {
      this.applyInputs();
    }

    if (
      changes['config'] ||
      changes['injectProviders']
    ) {
      await this.loadComponent();
    }
  }

  async loadComponent(): Promise<void> {
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
        console.warn(
          `Failed to load remote component '${resolved.componentName}' from '${resolved.exposedModule}': ${loaded.error.message}`,
          loaded.error,
        );
        return;
      }

      this.mountedComponent = loaded.value;

      this.applyInputs();
      this.loadedEvent.emit(true);
    } catch (error) {
      this.loadedEvent.emit(false);
      console.warn(
        `Failed to load remote component '${resolved.componentName}' from '${resolved.exposedModule}':`,
        error,
      );
    }
  }

  ngOnDestroy(): void {
    if (this.mountedComponent) {
      this.destroyedEvent.emit(true);
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.mountedComponent?.destroy();
    this.viewContainerRef.clear();
    this.mountedComponent = undefined;
  }

  private applyInputs(): void {
    if (!this.mountedComponent?.componentRef) {
      return;
    }

    for (const [key, value] of Object.entries(this.componentInputs || {})) {
      try {
        this.mountedComponent.componentRef.setInput(key, value);
      } catch (error) {
        console.warn(
          `Failed to set input '${key}' on component '${this.mountedComponent.componentName}':`,
          error,
        );
      }
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
