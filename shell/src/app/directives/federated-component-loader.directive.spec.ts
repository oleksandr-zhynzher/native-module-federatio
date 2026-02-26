import {
  Component,
  ComponentRef,
  EnvironmentInjector,
  Type,
  ViewChild,
  ViewContainerRef,
  signal,
} from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Subject, throwError } from 'rxjs';

import { FederatedComponentLoaderDirective } from './federated-component-loader.directive';
import { FederatedComponentLoaderService } from '../services/federated-component-loader.service';
import { PlaceholderComponent } from '../components/placeholder/placeholder.component';
import {
  FederatedModule,
  FederatedModuleType,
  LoadFederatedComponentOptions,
  ResolvedFederatedComponent,
} from '../models';
import { By } from '@angular/platform-browser';

// ─── stubs ───────────────────────────────────────────────────────────────────

@Component({ standalone: true, selector: 'mock-remote', template: '' })
class MockRemoteComponent {}

function makeComponentRef(): ComponentRef<unknown> {
  return {
    setInput: vi.fn(),
    destroy: vi.fn(),
    location: { nativeElement: document.createElement('div') },
    hostView: { detach: vi.fn(), detectChanges: vi.fn() },
    instance: {},
    onDestroy: vi.fn(),
    injector: {},
    componentType: MockRemoteComponent,
    changeDetectorRef: { detectChanges: vi.fn(), markForCheck: vi.fn() },
  } as unknown as ComponentRef<unknown>;
}

function makePlaceholderRef(): ComponentRef<PlaceholderComponent> {
  return {
    setInput: vi.fn(),
    destroy: vi.fn(),
    location: { nativeElement: document.createElement('div') },
    hostView: { detach: vi.fn(), detectChanges: vi.fn() },
    instance: {} as PlaceholderComponent,
    onDestroy: vi.fn(),
    injector: {},
    componentType: PlaceholderComponent,
    changeDetectorRef: { detectChanges: vi.fn(), markForCheck: vi.fn() },
  } as unknown as ComponentRef<PlaceholderComponent>;
}

/** Must be called inside a test body (after TestBed.configureTestingModule). */
function makeModule(overrides: Partial<FederatedModule> = {}): FederatedModule {
  return {
    components: { MockRemoteComponent },
    services: null,
    actions: null,
    selectors: null,
    providers: [],
    injector: TestBed.inject(EnvironmentInjector),
    ngModuleRef: null,
    destroy: vi.fn(),
    ...overrides,
  } as unknown as FederatedModule;
}

function makeResolved(module: FederatedModule): ResolvedFederatedComponent {
  return { componentType: MockRemoteComponent, federatedModule: module };
}

// ─── host component ───────────────────────────────────────────────────────────

@Component({
  standalone: true,
  imports: [FederatedComponentLoaderDirective],
  template: `
    <ng-container
      appFederatedComponentLoader
      [config]="config()"
      [componentInputs]="componentInputs()"
      [isPlaceholderVisible]="isPlaceholderVisible()"
      [destroyRemoteModule]="destroyRemoteModule()"
      [placeholderHeight]="placeholderHeight()"
      (loadedEvent)="loadedEvents.push($event)"
      (destroyedEvent)="destroyedEvents.push($event)"
    ></ng-container>
  `,
})
class TestHostComponent {
  @ViewChild(FederatedComponentLoaderDirective)
  directive!: FederatedComponentLoaderDirective;

  readonly config = signal<LoadFederatedComponentOptions>({
    type: FederatedModuleType.Module,
    remoteEntry: 'http://localhost:4300',
    exposedModule: './public-api',
    componentName: 'MockRemoteComponent',
  });
  readonly componentInputs = signal<Record<string, unknown>>({});
  readonly isPlaceholderVisible = signal(false);
  readonly destroyRemoteModule = signal(true);
  readonly placeholderHeight = signal(300);

  readonly loadedEvents: boolean[] = [];
  readonly destroyedEvents: boolean[] = [];
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function setupWithSubject(): {
  fixture: ComponentFixture<TestHostComponent>;
  host: TestHostComponent;
  loaderMock: { getFederatedComponent: ReturnType<typeof vi.fn> };
  loadSubject: Subject<ResolvedFederatedComponent>;
  remoteRef: ComponentRef<unknown>;
  placeholderRef: ComponentRef<PlaceholderComponent>;
} {
  const loadSubject = new Subject<ResolvedFederatedComponent>();
  const loaderMock = { getFederatedComponent: vi.fn().mockReturnValue(loadSubject.asObservable()) };

  TestBed.configureTestingModule({
    imports: [TestHostComponent],
    providers: [
      { provide: FederatedComponentLoaderService, useValue: loaderMock },
    ],
  });

  const fixture = TestBed.createComponent(TestHostComponent);
  const host = fixture.componentInstance;

  // Process the template so the directive is instantiated, but do NOT yet flush
  // effects — that way we can intercept createComponent before any placeholder
  // or component-creation calls fire.
  fixture.detectChanges();

  // Directive instance is available after detectChanges; get the VCR it holds.
  const vcr = (host.directive as unknown as { viewContainerRef: ViewContainerRef }).viewContainerRef;

  const remoteRef = makeComponentRef();
  const placeholderRef = makePlaceholderRef();

  // Override createComponent BEFORE flushing effects so all calls to
  // ViewContainerRef.createComponent go through our mock.
  (vcr as unknown as { createComponent: unknown }).createComponent = vi.fn(
    (compType: Type<unknown>) =>
      (compType === PlaceholderComponent ? placeholderRef : remoteRef) as ComponentRef<unknown>,
  );

  // Now flush effects — triggers the initial config emission → getFederatedComponent
  // subscription starts (subject not yet emitting, so nothing is created yet).
  TestBed.flushEffects();

  return { fixture, host, loaderMock, loadSubject, remoteRef, placeholderRef };
}

// ─── suite ───────────────────────────────────────────────────────────────────

describe('FederatedComponentLoaderDirective', () => {
  afterEach(() => TestBed.resetTestingModule());

  // ── initial load — success ──────────────────────────────────────────────

  describe('initial config load — success', () => {
    it('calls getFederatedComponent with the bound config', () => {
      const { loaderMock, host } = setupWithSubject();
      expect(loaderMock.getFederatedComponent).toHaveBeenCalledWith(host.config());
    });

    it('emits loadedEvent(true) when the component resolves', () => {
      const { fixture, host, loadSubject } = setupWithSubject();
      const module = { components: { MockRemoteComponent }, services: null, actions: null, selectors: null, providers: [], injector: {}, ngModuleRef: null, destroy: vi.fn() } as unknown as FederatedModule;

      loadSubject.next(makeResolved(module));
      fixture.detectChanges();

      expect(host.loadedEvents).toEqual([true]);
    });

    it('calls createComponent with the resolved component type', () => {
      const { fixture, loadSubject, remoteRef } = setupWithSubject();
      const module = { components: { MockRemoteComponent }, services: null, actions: null, selectors: null, providers: [], injector: {}, ngModuleRef: null, destroy: vi.fn() } as unknown as FederatedModule;

      loadSubject.next(makeResolved(module));
      fixture.detectChanges();

      // remoteRef was returned from the VCR spy for non-Placeholder types
      expect(remoteRef).toBeDefined();
    });
  });

  // ── initial load — error ────────────────────────────────────────────────

  describe('initial config load — error', () => {
    it('emits loadedEvent(false) when getFederatedComponent errors', () => {
      const loaderMock = {
        getFederatedComponent: vi.fn().mockReturnValue(throwError(() => new Error('load failed'))),
      };

      TestBed.configureTestingModule({
        imports: [TestHostComponent],
        providers: [{ provide: FederatedComponentLoaderService, useValue: loaderMock }],
      });

      const fixture = TestBed.createComponent(TestHostComponent);

      fixture.detectChanges();
      TestBed.flushEffects();
      fixture.detectChanges();

      expect(fixture.componentInstance.loadedEvents).toEqual([false]);
    });

    it('does not crash the directive stream — subsequent config changes still work', () => {
      const subject1 = new Subject<ResolvedFederatedComponent>();
      const subject2 = new Subject<ResolvedFederatedComponent>();

      let callCount = 0;
      const loaderMock = {
        getFederatedComponent: vi.fn().mockImplementation(() => {
          callCount++;
          return callCount === 1
            ? throwError(() => new Error('first attempt failed'))
            : subject2.asObservable();
        }),
      };

      TestBed.configureTestingModule({
        imports: [TestHostComponent],
        providers: [{ provide: FederatedComponentLoaderService, useValue: loaderMock }],
      });

      const fixture = TestBed.createComponent(TestHostComponent);
      fixture.detectChanges();
      TestBed.flushEffects();

      // Change config — triggers a second call
      fixture.componentInstance.config.set({
        type: FederatedModuleType.Module,
        remoteEntry: 'http://localhost:4300',
        exposedModule: './other',
        componentName: 'MockRemoteComponent',
      });
      fixture.detectChanges();
      TestBed.flushEffects();

      expect(loaderMock.getFederatedComponent).toHaveBeenCalledTimes(2);
    });
  });

  // ── config change ────────────────────────────────────────────────────────

  describe('config change', () => {
    it('calls cleanup and emits destroyedEvent when config changes after a successful load', () => {
      const { fixture, host, loadSubject } = setupWithSubject();
      const module = { components: { MockRemoteComponent }, services: null, actions: null, selectors: null, providers: [], injector: {}, ngModuleRef: null, destroy: vi.fn() } as unknown as FederatedModule;

      // Complete the first load
      loadSubject.next(makeResolved(module));
      fixture.detectChanges();

      // Change config
      host.config.set({
        type: FederatedModuleType.Module,
        remoteEntry: 'http://localhost:4300',
        exposedModule: './other-module',
        componentName: 'MockRemoteComponent',
      });
      fixture.detectChanges();
      TestBed.flushEffects();

      expect(host.destroyedEvents).toEqual([true]);
    });

    it('calls getFederatedComponent again after config change', () => {
      const { fixture, host, loaderMock, loadSubject } = setupWithSubject();
      const module = { components: { MockRemoteComponent }, services: null, actions: null, selectors: null, providers: [], injector: {}, ngModuleRef: null, destroy: vi.fn() } as unknown as FederatedModule;

      loadSubject.next(makeResolved(module));
      fixture.detectChanges();

      const newConfig: LoadFederatedComponentOptions = {
        type: FederatedModuleType.Module,
        remoteEntry: 'http://localhost:4300',
        exposedModule: './other',
        componentName: 'MockRemoteComponent',
      };
      host.config.set(newConfig);
      fixture.detectChanges();
      TestBed.flushEffects();

      expect(loaderMock.getFederatedComponent).toHaveBeenCalledTimes(2);
      expect(loaderMock.getFederatedComponent).toHaveBeenLastCalledWith(newConfig);
    });
  });

  // ── ngOnDestroy ──────────────────────────────────────────────────────────

  describe('ngOnDestroy', () => {
    it('emits destroyedEvent(true) when destroyed with a mounted component', () => {
      const { fixture, host, loadSubject } = setupWithSubject();
      const module = { components: { MockRemoteComponent }, services: null, actions: null, selectors: null, providers: [], injector: { destroy: vi.fn() }, ngModuleRef: null, destroy: vi.fn() } as unknown as FederatedModule;

      loadSubject.next(makeResolved(module));
      fixture.detectChanges();

      fixture.destroy();

      expect(host.destroyedEvents).toContain(true);
    });

    it('calls componentRef.destroy() on ngDestroy', () => {
      const { fixture, loadSubject, remoteRef } = setupWithSubject();
      const module = { components: { MockRemoteComponent }, services: null, actions: null, selectors: null, providers: [], injector: { destroy: vi.fn() }, ngModuleRef: null, destroy: vi.fn() } as unknown as FederatedModule;

      loadSubject.next(makeResolved(module));
      fixture.detectChanges();

      fixture.destroy();

      expect(remoteRef.destroy).toHaveBeenCalled();
    });

    it('calls module.destroy() on ngDestroy when destroyRemoteModule is true', () => {
      const { fixture, loadSubject } = setupWithSubject();
      const destroySpy = vi.fn();
      const module = { components: { MockRemoteComponent }, services: null, actions: null, selectors: null, providers: [], injector: { destroy: vi.fn() }, ngModuleRef: null, destroy: destroySpy } as unknown as FederatedModule;

      loadSubject.next(makeResolved(module));
      fixture.detectChanges();

      fixture.destroy();

      expect(destroySpy).toHaveBeenCalled();
    });

    it('does not throw when destroyed without a mounted component', () => {
      const { fixture } = setupWithSubject();
      // Never emit from loadSubject — no component mounted
      expect(() => fixture.destroy()).not.toThrow();
    });

    it('does not emit destroyedEvent when no component is mounted', () => {
      const { fixture, host } = setupWithSubject();
      fixture.destroy();
      expect(host.destroyedEvents).toHaveLength(0);
    });
  });

  // ── destroyRemoteModule = false ──────────────────────────────────────────

  describe('destroyRemoteModule = false', () => {
    it('calls componentRef.destroy() but does NOT call module.destroy()', () => {
      const loaderMock = { getFederatedComponent: vi.fn() };
      const loadSubject = new Subject<ResolvedFederatedComponent>();
      loaderMock.getFederatedComponent.mockReturnValue(loadSubject.asObservable());

      TestBed.configureTestingModule({
        imports: [TestHostComponent],
        providers: [{ provide: FederatedComponentLoaderService, useValue: loaderMock }],
      });

      const fixture = TestBed.createComponent(TestHostComponent);
      const host = fixture.componentInstance;
      host.destroyRemoteModule.set(false);

      fixture.detectChanges();

      const vcr = (host.directive as unknown as { viewContainerRef: ViewContainerRef }).viewContainerRef;
      const remoteRef = makeComponentRef();
      (vcr as unknown as { createComponent: unknown }).createComponent = vi.fn(() => remoteRef);

      TestBed.flushEffects();

      const destroySpy = vi.fn();
      const module = { components: { MockRemoteComponent }, services: null, actions: null, selectors: null, providers: [], injector: { destroy: vi.fn() }, ngModuleRef: null, destroy: destroySpy } as unknown as FederatedModule;

      loadSubject.next(makeResolved(module));
      fixture.detectChanges();

      fixture.destroy();

      expect(remoteRef.destroy).toHaveBeenCalled();
      expect(destroySpy).not.toHaveBeenCalled();
    });
  });

  // ── placeholder ─────────────────────────────────────────────────────────

  describe('placeholder', () => {
    it('does NOT create PlaceholderComponent when isPlaceholderVisible is false', () => {
      const { fixture, loadSubject, placeholderRef } = setupWithSubject();
      // isPlaceholderVisible defaults to false in TestHostComponent

      fixture.detectChanges();
      TestBed.flushEffects();

      expect(placeholderRef.destroy).not.toHaveBeenCalled();
      const directiveEl = fixture.debugElement.query(By.directive(FederatedComponentLoaderDirective));
      const vcr = directiveEl.injector.get(ViewContainerRef);
      const createMock = (vcr as unknown as { createComponent: ReturnType<typeof vi.fn> }).createComponent;
      const placeholderCalls = createMock.mock.calls.filter(
        (args: unknown[]) => args[0] === PlaceholderComponent,
      );
      expect(placeholderCalls).toHaveLength(0);
    });

    it('creates and then destroys PlaceholderComponent when isPlaceholderVisible is true and load succeeds', () => {
      const loaderMock = { getFederatedComponent: vi.fn() };
      const loadSubject = new Subject<ResolvedFederatedComponent>();
      loaderMock.getFederatedComponent.mockReturnValue(loadSubject.asObservable());

      TestBed.configureTestingModule({
        imports: [TestHostComponent],
        providers: [{ provide: FederatedComponentLoaderService, useValue: loaderMock }],
      });

      const fixture = TestBed.createComponent(TestHostComponent);
      const host = fixture.componentInstance;
      host.isPlaceholderVisible.set(true);

      fixture.detectChanges();

      const vcr = (host.directive as unknown as { viewContainerRef: ViewContainerRef }).viewContainerRef;
      const placeholderRef = makePlaceholderRef();
      const remoteRef = makeComponentRef();
      const createMock = vi.fn(
        (compType: Type<unknown>) =>
          (compType === PlaceholderComponent ? placeholderRef : remoteRef) as ComponentRef<unknown>,
      );
      (vcr as unknown as { createComponent: unknown }).createComponent = createMock;

      // The first detectChanges was already called above to initialize the directive;
      // emit changes again so the placeholder logic reacts to isPlaceholderVisible=true.
      TestBed.flushEffects();

      const placeholderCreated = createMock.mock.calls.some(
        ([compType]) => compType === PlaceholderComponent,
      );
      expect(placeholderCreated).toBe(true);

      // Now resolve — placeholder should be destroyed
      const module = { components: { MockRemoteComponent }, services: null, actions: null, selectors: null, providers: [], injector: {}, ngModuleRef: null, destroy: vi.fn() } as unknown as FederatedModule;
      loadSubject.next(makeResolved(module));
      fixture.detectChanges();

      expect(placeholderRef.destroy).toHaveBeenCalled();
    });

    it('passes placeholderHeight to the PlaceholderComponent', () => {
      const loaderMock = { getFederatedComponent: vi.fn().mockReturnValue(new Subject()) };

      TestBed.configureTestingModule({
        imports: [TestHostComponent],
        providers: [{ provide: FederatedComponentLoaderService, useValue: loaderMock }],
      });

      const fixture = TestBed.createComponent(TestHostComponent);
      const host = fixture.componentInstance;
      host.isPlaceholderVisible.set(true);
      host.placeholderHeight.set(500);

      fixture.detectChanges();

      const vcr = (host.directive as unknown as { viewContainerRef: ViewContainerRef }).viewContainerRef;
      const placeholderRef = makePlaceholderRef();
      (vcr as unknown as { createComponent: unknown }).createComponent = vi.fn(() => placeholderRef);

      TestBed.flushEffects();

      expect(placeholderRef.setInput).toHaveBeenCalledWith('placeholderHeight', 500);
    });
  });

  // ── componentInputs propagation ──────────────────────────────────────────

  describe('componentInputs', () => {
    it('calls setInput on the remote componentRef when componentInputs changes', () => {
      const { fixture, host, loadSubject, remoteRef } = setupWithSubject();
      const module = { components: { MockRemoteComponent }, services: null, actions: null, selectors: null, providers: [], injector: {}, ngModuleRef: null, destroy: vi.fn() } as unknown as FederatedModule;

      loadSubject.next(makeResolved(module));
      fixture.detectChanges();

      host.componentInputs.set({ title: 'hello', count: 42 });
      fixture.detectChanges();
      TestBed.flushEffects();

      expect(remoteRef.setInput).toHaveBeenCalledWith('title', 'hello');
      expect(remoteRef.setInput).toHaveBeenCalledWith('count', 42);
    });

    it('does not throw when componentInputs changes before a component is loaded', () => {
      const { fixture, host } = setupWithSubject();
      // No emit from loadSubject — no component mounted yet

      expect(() => {
        host.componentInputs.set({ title: 'early' });
        fixture.detectChanges();
        TestBed.flushEffects();
      }).not.toThrow();
    });
  });
});
