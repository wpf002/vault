import type { ComponentType } from 'react';

/**
 * Every mini-app in modules/<slug> exports a ModuleManifest as default.
 * The shell reads this to mount the app, gate it, and route to it.
 * The app itself never checks entitlements — the shell wraps it.
 */
export interface ModuleManifest {
  slug: string;              // must match the Module row slug
  name: string;
  /** the root component the shell renders once access is confirmed */
  Component: ComponentType;
  /** optional: called server-side to seed demo data for the preview */
  seedPreview?: () => Promise<void>;
}

export function defineModule(manifest: ModuleManifest): ModuleManifest {
  return manifest;
}
