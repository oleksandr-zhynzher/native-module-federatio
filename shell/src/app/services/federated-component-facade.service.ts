import {
  ComponentRef,
  EnvironmentProviders,
  Injectable,
  Injector,
  NgModuleRef,
  Provider,
  Type,
  ViewContainerRef,
} from '@angular/core';
import {
  errorResult,
  FederatedLoaderConfig,
  FederatedLoaderConfigInput,
  Result,
  isComponentType,
  isModuleWithProviders,
  isNgModuleType,
  isValidProvidersArray,
  normalizeFederatedConfig,
  okResult,
} from './federated-contract';
import {
  FederatedOwnedInjector,
  FederatedModule,
  FederatedProvidersInjectorService,
} from './federated-providers-injector.service';
import { RemoteModuleLoader } from './remote-module-loader.service';

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

  private createOwnedInjector(
    remoteExports: FederatedModule,
    injectProviders: boolean,
    moduleProviders: (Provider | EnvironmentProviders)[] = [],
  ): Result<FederatedOwnedInjector> {
    let providersToInject: (Provider | EnvironmentProviders)[] = [...moduleProviders];

    if (injectProviders && remoteExports.providers) {
      providersToInject = [...providersToInject, ...remoteExports.providers];
    }

    if (providersToInject.length === 0) {
      return okResult(this.providersInjector.createOwnedInjector(remoteExports, false));
    }

    if (!isValidProvidersArray(providersToInject)) {
      return errorResult({
        code: 'INVALID_PROVIDERS_EXPORT',
        message:
          'Remote module exported invalid providers format. Expected an array of Provider or EnvironmentProviders.',
        details: { providers: providersToInject },
      });
    }

    const moduleWithCombinedProviders = {
      ...remoteExports,
      providers: providersToInject,
    };

    return okResult(this.providersInjector.createOwnedInjector(moduleWithCombinedProviders, true));
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
      const err = (componentTypeResult as { ok: false; error: unknown }).error;
      return errorResult(err as any);
    }

    const moduleTypeResult = this.resolveModuleType(remoteExports, resolved.moduleName);
    if (!moduleTypeResult.ok) {
      const err = (moduleTypeResult as { ok: false; error: unknown }).error;
      return errorResult(err as any);
    }

    let moduleRef: NgModuleRef<unknown> | undefined;
    let ownedInjector: FederatedOwnedInjector | undefined;
    let componentRef: ComponentRef<unknown> | undefined;

    try {
      const moduleProviders = moduleTypeResult.value.providers || [];

      const injectorResult = this.createOwnedInjector(
        remoteExports as FederatedModule,
        resolved.injectProviders,
        moduleProviders,
      );
      if (!injectorResult.ok) {
        const err = (injectorResult as { ok: false; error: unknown }).error;

        return errorResult(err as any);
      }

      ownedInjector = injectorResult.value;

      moduleRef = this.remoteModuleLoader.createRemoteNgModuleRef(
        moduleTypeResult.value.ngModule,
        ownedInjector.injector,
      );

      componentRef = viewContainerRef.createComponent(componentTypeResult.value, {
        ngModuleRef: moduleRef,
        injector: moduleRef.injector,
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

  private resolveModuleType(
    remoteExports: Record<string, unknown>,
    name: string,
  ): Result<{ ngModule: Type<unknown>; providers?: (Provider | EnvironmentProviders)[] }> {
    const candidate = remoteExports[name];

    if (!candidate) {
      // If moduleName is not found, try to find a module in the exports
      const moduleExport = Object.values(remoteExports).find(
        (exp) => isNgModuleType(exp) || isModuleWithProviders(exp),
      );

      if (moduleExport) {
        if (isNgModuleType(moduleExport)) {
          return okResult({ ngModule: moduleExport });
        }
        if (isModuleWithProviders(moduleExport)) {
          return okResult({ ngModule: moduleExport.ngModule, providers: moduleExport.providers });
        }
      }

      return errorResult({
        code: 'MODULE_NOT_FOUND',
        message: `Module '${name}' not found in remote exports.`,
      });
    }

    if (isNgModuleType(candidate)) {
      return okResult({ ngModule: candidate });
    }

    if (isModuleWithProviders(candidate)) {
      return okResult({ ngModule: candidate.ngModule, providers: candidate.providers });
    }

    return errorResult({
      code: 'INVALID_MODULE_EXPORT',
      message: `Export '${name}' is not an Angular NgModule type or ModuleWithProviders.`,
    });
  }
}
