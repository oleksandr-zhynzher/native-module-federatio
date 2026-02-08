import { CustomWebpackBrowserSchema, TargetOptions } from '@angular-builders/custom-webpack';
import { Configuration, container } from 'webpack';

export default (
  config: Configuration,
  options: CustomWebpackBrowserSchema,
  targetOptions: TargetOptions
) => {
  // Set unique output name to avoid conflicts
  config.output = config.output || {};
  config.output.uniqueName = 'shell';

  // Enable ES module experiments for modern Module Federation
  config.experiments = config.experiments || {};
  config.experiments.outputModule = true;

  // Disable runtimeChunk optimization (required for Module Federation)
  config.optimization = config.optimization || {};
  config.optimization.runtimeChunk = false;

  // Configure Module Federation Plugin
  config.plugins = config.plugins || [];
  config.plugins.push(
    new container.ModuleFederationPlugin({
      library: { type: 'module' },
      
      // No static remotes - will use dynamic loadRemoteModule
      remotes: {},
      shared: {
        '@angular/animations': { singleton: true, eager: false },
        '@angular/common': { singleton: true, eager: false },
        '@angular/compiler': { singleton: true, eager: false },
        '@angular/core': { singleton: true, eager: false },
        '@angular/forms': { singleton: true, eager: false },
        '@angular/platform-browser': { singleton: true, eager: false },
        '@angular/platform-browser-dynamic': { singleton: true, eager: false },
        '@angular/router': { singleton: true, eager: false },
        '@ngrx/store': { singleton: true, eager: false },
        '@ngrx/effects': { singleton: true, eager: false },
        '@ngrx/store-devtools': { singleton: true, eager: false },
        rxjs: { singleton: true, eager: false },
      },
    })
  );

  return config;
};
