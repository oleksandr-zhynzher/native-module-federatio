import {
  DestroyRef,
  Directive,
  EventEmitter,
  Output,
  ViewContainerRef,
  effect,
  inject,
  input,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, switchMap } from 'rxjs';
import {
  FederatedLoaderConfig,
  FederatedLoaderService,
  MountedComponent,
} from '../services/federated-loader.service';

@Directive({
  selector: '[appDynamicFederatedLoader]',
})
export class RemoteComponentRenderer {
  private readonly componentMountService = inject(FederatedLoaderService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);

  public readonly componentInputs = input<Record<string, unknown>>({});
  public readonly config = input<FederatedLoaderConfig | null>(null);

  @Output() public readonly destroyedEvent = new EventEmitter<boolean>();
  @Output() public readonly loadedEvent = new EventEmitter<boolean>();

  private mountedComponent?: MountedComponent;

  constructor() {
    this.setupConfigStream();
    this.setupInputsEffect();

    this.destroyRef.onDestroy(() => {
      if (this.mountedComponent) {
        this.destroyedEvent.emit(true);
      }
      this.cleanup();
    });
  }

  private setupConfigStream(): void {
    toObservable(this.config)
      .pipe(
        switchMap((config) => {
          if (!config || !this.isValidConfig(config)) {
            const wasActive = this.mountedComponent != null;
            this.cleanup();
            if (wasActive) {
              this.emitLoadFailure();
            }
            return EMPTY;
          }

          this.cleanup();

          return this.componentMountService.loadAndMountComponent(config, this.viewContainerRef).pipe(
            catchError((error) => {
              console.warn(
                `Failed to load remote component '${config.componentName}' from '${config.exposedModule}':`,
                error,
              );
              this.emitLoadFailure();
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((loaded) => {
        this.mountedComponent = loaded;
        this.applyInputs(this.componentInputs());
        this.loadedEvent.emit(true);
      });
  }

  private setupInputsEffect(): void {
    effect(() => {
      this.applyInputs(this.componentInputs());
    });
  }

  private isValidConfig(config: FederatedLoaderConfig): boolean {
    return !!(
      config.remoteEntry &&
      config.exposedModule &&
      config.componentName &&
      config.moduleName
    );
  }

  private applyInputs(inputs: Record<string, unknown>): void {
    if (!this.mountedComponent) {
      return;
    }

    for (const [key, value] of Object.entries(inputs)) {
      try {
        this.mountedComponent.setInput(key, value);
      } catch (error) {
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

  private emitLoadFailure(): void {
    this.loadedEvent.emit(false);
  }
}
