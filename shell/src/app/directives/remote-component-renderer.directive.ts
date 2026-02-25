import {
  DestroyRef,
  Directive,
  OnDestroy,
  OnInit,
  ViewContainerRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, switchMap, tap } from 'rxjs';

import { RyLoadRemoteModuleOptions, RemoteComponentRef } from '../models';
import { FederatedComponentLoaderService } from '../services';

@Directive({
  selector: '[appDynamicFederatedLoader]',
  standalone: true,
})
export class RemoteComponentRenderer implements OnInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private readonly federatedComponentLoader = inject(FederatedComponentLoaderService);
  private readonly viewContainerRef = inject(ViewContainerRef);

  public readonly componentInputs = input<Record<string, unknown>>({});
  public readonly config = input.required<RyLoadRemoteModuleOptions>();

  public readonly destroyedEvent = output<boolean>();
  public readonly loadedEvent = output<boolean>();

  private readonly remoteComponent = signal<RemoteComponentRef | undefined>(undefined);

  constructor() {
    effect(() => {
      this.applyInputs();
    });
  }

  public ngOnInit(): void {
    toObservable(this.config)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.cleanup()),
        switchMap((config) =>
          this.federatedComponentLoader.getRemoteComponent(config, this.viewContainerRef).pipe(
            catchError((error) => {
              this.emitLoadFailure();
              console.warn('error = ', error);
              return EMPTY;
            }),
          ),
        ),
      )
      .subscribe((component) => {
        this.remoteComponent.set(component);
        // Explicitly apply inputs that may have changed during the in-flight load,
        // since the effect only tracks signals read in its last execution.
        untracked(() => this.applyInputs());
        this.loadedEvent.emit(true);
      });
  }

  public ngOnDestroy(): void {
    this.cleanup();
  }

  private applyInputs(): void {
    const component = this.remoteComponent();
    const inputs = this.componentInputs();

    if (!component) {
      return;
    }

    const config = untracked(() => this.config());

    for (const [key, value] of Object.entries(inputs)) {
      try {
        component.componentRef.setInput(key, value);
      } catch (error) {
        console.warn(
          `Failed to set input '${key}' on component '${config.componentName ?? ''}':`,
          error,
        );
      }
    }
  }

  private cleanup(): void {
    const component = this.remoteComponent();

    if (component) {
      this.destroyedEvent.emit(true);
      component.destroy();
      this.remoteComponent.set(undefined);
    }

    this.viewContainerRef.clear();
  }

  private emitLoadFailure(): void {
    this.loadedEvent.emit(false);
  }
}
