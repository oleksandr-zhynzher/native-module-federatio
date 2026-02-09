import { CustomWebpackBrowserSchema, TargetOptions } from '@angular-builders/custom-webpack';
import { Configuration, container } from 'webpack';
import * as path from 'path';

export default (
  config: Configuration,
  options: CustomWebpackBrowserSchema,
  targetOptions: TargetOptions
) => {
  // Set unique output name to avoid conflicts
  config.output = config.output || {};
  config.output.uniqueName = 'remote';
  config.output.publicPath = 'http://localhost:4300/';

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
      name: 'remote',
      filename: 'remoteEntry.js',
      exposes: {
        './public-api': path.resolve(__dirname, './src/app/public_api.ts'),
        './service': path.resolve(__dirname, './src/app/services/users.service.ts'),
      },
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
