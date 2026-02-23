import { App } from './app';
export { AppModule as ngModule } from './app.module';
export const REMOTE_COMPONENTS = {
  App: App,
} as const;
export type RemoteComponentName = keyof typeof REMOTE_COMPONENTS;
