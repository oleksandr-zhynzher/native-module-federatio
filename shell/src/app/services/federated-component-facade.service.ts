import {
  ComponentRef,
  EnvironmentInjector,
  Injectable,
  Injector,
  NgModuleRef,
  Type,
  ViewContainerRef,
} from '@angular/core';
import { RemoteModuleLoader } from './remote-module-loader.service';
import {
  FederatedOwnedInjector,
  FederatedModule,
  FederatedProvidersInjectorService,
} from './federated-providers-injector.service';
import {
  errorResult,
  FederatedLoaderConfig,
  FederatedLoaderConfigInput,
  Result,
  isComponentType,
  isNgModuleType,
  isValidProvidersArray,
  normalizeFederatedConfig,
  okResult,
} from './federated-contract';

export interface ResolvedFederatedConfig {
  remoteEntry: string;
  exposedModule: string;
  componentName: string;
  moduleName: string;
  injectProviders: boolean;
}

export interface LoadedFederatedComponent {
  componentName: string;
  componentType: Type<unknown>;
  componentRef: ComponentRef<unknown>;
  moduleRef: NgModuleRef<unknown>;
  ownedInjector: FederatedOwnedInjector;
  destroy(): void;
}

@Injectable({ providedIn: 'root' })
export class FederatedComponentFacadeService {
  constructor(
    private readonly remoteModuleLoader: RemoteModuleLoader,
    private readonly providersInjector: FederatedProvidersInjectorService,
  ) {}

  resolveConfig(
    config: FederatedLoaderConfigInput | undefined,
    fallback: FederatedLoaderConfig,
  ): ResolvedFederatedConfig {
    const normalized = normalizeFederatedConfig(config, fallback);

    return {
      remoteEntry: normalized.remoteEntry,
      exposedModule: normalized.exposedModule,
      componentName: normalized.componentName,
      moduleName: normalized.moduleName,
      injectProviders: normalized.injectProviders,
    };
  }

  async loadAndMountComponent(
    resolved: ResolvedFederatedConfig,
    hostInjector: Injector,
    viewContainerRef: ViewContainerRef,
  ): Promise<Result<LoadedFederatedComponent>> {
    let remoteExports: Record<string, unknown>;
    try {
      remoteExports = await this.remoteModuleLoader.loadRemoteModule({
        remoteEntry: resolved.remoteEntry,
        exposedModule: resolved.exposedModule,
      });
    } catch (error) {
      return errorResult({
        code: 'REMOTE_MODULE_LOAD_FAILED',
        message: `Failed to load remote module from '${resolved.remoteEntry}' and '${resolved.exposedModule}'.`,
        cause: error,
      });
    }

    const componentTypeResult = this.resolveComponentType(remoteExports, resolved.componentName);
    if (!componentTypeResult.ok) {
      return componentTypeResult;
    }

    const moduleTypeResult = this.resolveModuleType(remoteExports, resolved.moduleName);
    if (!moduleTypeResult.ok) {
      return moduleTypeResult;
    }

    let moduleRef: NgModuleRef<unknown> | undefined;
    let ownedInjector: FederatedOwnedInjector | undefined;
    let componentRef: ComponentRef<unknown> | undefined;

    try {
      moduleRef = this.remoteModuleLoader.createRemoteNgModuleRef(moduleTypeResult.value, hostInjector);

      const injectorResult = this.createOwnedInjector(
        remoteExports as FederatedModule,
        resolved.injectProviders,
      );
      if (!injectorResult.ok) {
        moduleRef.destroy();
        return injectorResult;
      }

      ownedInjector = injectorResult.value;

      componentRef = viewContainerRef.createComponent(componentTypeResult.value, {
        ngModuleRef: moduleRef,
        injector: ownedInjector.injector,
      });
    } catch (error) {
      componentRef?.destroy();
      moduleRef?.destroy();
      ownedInjector?.destroy();

      return errorResult({
        code: 'COMPONENT_RENDER_FAILED',
        message: `Failed to mount remote component '${resolved.componentName}' from '${resolved.exposedModule}'.`,
        cause: error,
      });
    }

    if (!componentRef || !moduleRef || !ownedInjector) {
      return errorResult({
        code: 'COMPONENT_RENDER_FAILED',
        message: `Failed to mount remote component '${resolved.componentName}' from '${resolved.exposedModule}'.`,
      });
    }

    return okResult({
      componentName: resolved.componentName,
      componentType: componentTypeResult.value,
      componentRef,
      moduleRef,
      ownedInjector,
      destroy: () => {
        componentRef?.destroy();
        moduleRef?.destroy();
        ownedInjector?.destroy();
      },
    });
  }

  private createOwnedInjector(
    remoteExports: FederatedModule,
    injectProviders: boolean,
  ): Result<FederatedOwnedInjector> {
    if (!injectProviders) {
      return okResult(this.providersInjector.createOwnedInjector(remoteExports, false));
    }

    const providers = remoteExports.providers;
    if (!providers) {
      return okResult(this.providersInjector.createOwnedInjector(remoteExports, true));
    }

    if (!isValidProvidersArray(providers)) {
      return errorResult({
        code: 'INVALID_PROVIDERS_EXPORT',
        message:
          'Remote module exported invalid providers format. Expected an array of Provider or EnvironmentProviders.',
        details: { providers },
      });
    }

    if (providers.length === 0) {
      return okResult(this.providersInjector.createOwnedInjector(remoteExports, true));
    }

    return okResult(this.providersInjector.createOwnedInjector(remoteExports, true));
  }

  private resolveComponentType(
    remoteExports: Record<string, unknown>,
    name: string,
  ): Result<Type<unknown>> {
    const registry = remoteExports['REMOTE_COMPONENTS'] as Record<string, unknown> | undefined;
    const candidate = registry?.[name] ?? remoteExports[name];

    if (!candidate) {
      return errorResult({
        code: 'COMPONENT_NOT_FOUND',
        message: `Component '${name}' not found in remote exports.`,
      });
    }

    if (!isComponentType(candidate)) {
      return errorResult({
        code: 'INVALID_COMPONENT_EXPORT',
        message: `Export '${name}' is not an Angular component type.`,
      });
    }

    return okResult(candidate);
  }

  private resolveModuleType(
    remoteExports: Record<string, unknown>,
    name: string,
  ): Result<Type<unknown>> {
    const candidate = remoteExports[name];

    if (!candidate) {
      return errorResult({
        code: 'MODULE_NOT_FOUND',
        message: `Module '${name}' not found in remote exports.`,
      });
    }

    if (!isNgModuleType(candidate)) {
      return errorResult({
        code: 'INVALID_MODULE_EXPORT',
        message: `Export '${name}' is not an Angular NgModule type.`,
      });
    }

    return okResult(candidate);
  }
}
