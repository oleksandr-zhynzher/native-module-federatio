import {
  ComponentRef,
  DestroyRef,
  Directive,
  OnDestroy,
  OnInit,
  Type,
  ViewContainerRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, switchMap, tap, filter, skip } from 'rxjs';

import { FederatedComponentRef, FederatedModule, LoadFederatedComponentOptions } from '../models';
import { FederatedComponentLoaderService } from '../services/federated-component-loader.service';
import { PlaceholderComponent } from '../components/placeholder/placeholder.component';

@Directive({
  selector: '[appFederatedComponentLoader]',
  standalone: true,
})
export class FederatedComponentLoaderDirective implements OnInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private readonly federatedComponentLoader = inject(FederatedComponentLoaderService);
  private readonly viewContainerRef = inject(ViewContainerRef);

  public componentInputs = input<Record<string, unknown>>({});
  public isPlaceholderVisible = input<boolean>(false);
  public destroyRemoteModule = input<boolean>(true);
  public placeholderHeight = input<number>(300);
  public config = input.required<LoadFederatedComponentOptions>();

  public readonly destroyedEvent = output<boolean>();
  public readonly loadedEvent = output<boolean>();

  private readonly federatedComponentRef = signal<FederatedComponentRef | null>(null);
  private placeholderRef: ComponentRef<PlaceholderComponent> | null = null;

  private readonly config$ = toObservable(this.config);
  private readonly componentInputs$ = toObservable(this.componentInputs);

  public ngOnInit(): void {
    this.componentInputs$.pipe(skip(1), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.applyInputs();
    });

    this.config$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter(Boolean),
        tap(() => {
          this.cleanup();
          this.showPlaceholder();
        }),
        switchMap((config) =>
          this.federatedComponentLoader.getFederatedComponent(config).pipe(
            catchError((error) => {
              console.error(
                `Failed to load component "${config?.componentName}" from "${config?.exposedModule}" at "${config?.remoteEntry}":`,
                error,
              );
              this.loadedEvent.emit(false);
              return EMPTY;
            }),
          ),
        ),
      )
      .subscribe(({ componentType, federatedModule }) => {
        this.hidePlaceholder();
        this.federatedComponentRef.set(
          this.createComponentInstance(componentType, federatedModule),
        );
        this.applyInputs();
        this.loadedEvent.emit(true);
      });
  }

  public ngOnDestroy(): void {
    this.cleanup();
  }

  private applyInputs(): void {
    const component = this.federatedComponentRef();
    const inputs = this.componentInputs();

    if (!component) {
      return;
    }

    for (const [key, value] of Object.entries(inputs)) {
      try {
        component.componentRef.setInput(key, value);
      } catch (error) {
        console.warn(
          `Failed to set input "${key}" on component "${this.config().componentName ?? ''}". ` +
            `Ensure the component has an @Input() with this name.`,
          error,
        );
      }
    }
  }

  private cleanup(): void {
    const component = this.federatedComponentRef();

    if (component) {
      this.destroyedEvent.emit(true);
      this.federatedComponentRef.set(null);
      component.componentRef.destroy();

      if (this.destroyRemoteModule()) {
        component.destroy();
      }
    }

    this.hidePlaceholder();
  }

  private showPlaceholder(): void {
    if (this.placeholderRef || !this.isPlaceholderVisible()) return;

    this.placeholderRef = this.viewContainerRef.createComponent(PlaceholderComponent, {
      injector: this.viewContainerRef.injector,
    });
    this.placeholderRef.setInput('placeholderHeight', this.placeholderHeight());
  }

  private hidePlaceholder(): void {
    if (this.placeholderRef) {
      this.placeholderRef.destroy();
      this.placeholderRef = null;
    }
  }

  private createComponentInstance(
    componentType: Type<unknown>,
    federatedModule: FederatedModule,
  ): FederatedComponentRef {
    const { ngModuleRef, injector } = federatedModule;
    const componentRef = this.viewContainerRef.createComponent(componentType, {
      ngModuleRef: ngModuleRef ?? undefined,
      injector,
    });

    return {
      componentRef,
      destroy: () => {
        federatedModule.destroy();
      },
    };
  }
}
