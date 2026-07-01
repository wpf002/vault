import type { ComponentType } from 'react';
import type { StoreClient } from './store.js';

export type ModuleMode = 'preview' | 'full';

export interface ModuleComponentProps {
  mode: ModuleMode;
  /** the module's slice of the generic document store — ephemeral in preview, persisted in full */
  store: StoreClient;
  /** call this from a gated action (export, download, etc.) in preview mode to surface the buy wall */
  requestUpgrade: () => void;
}

/**
 * Every mini-app in modules/<slug> exports a ModuleManifest as default.
 * The shell reads this to mount the app, gate it, and route to it.
 * The app itself never checks entitlements — the shell wraps it and
 * decides `mode`; the app just renders differently and uses `store`.
 */
export interface ModuleManifest {
  slug: string; // must match the Module row slug
  name: string;
  Component: ComponentType<ModuleComponentProps>;
  /** returns the demo data preview mode starts with — never touches the real store */
  seedPreview?: () => Record<string, unknown[]>;
}

export function defineModule(manifest: ModuleManifest): ModuleManifest {
  return manifest;
}

export { createStoreClient } from './store.js';
export type { StoreClient, StoreDoc } from './store.js';
