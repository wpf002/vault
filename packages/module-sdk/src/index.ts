import type { ComponentType } from 'react';
import type { StoreClient } from './store';
import type { AiClient } from './ai';
import type { ModuleTheme } from './theme';

export type ModuleMode = 'preview' | 'full';

export interface ModuleComponentProps {
  mode: ModuleMode;
  /** the module's slice of the generic document store — ephemeral in preview, persisted in full */
  store: StoreClient;
  /** call this from a gated action (export, download, etc.) in preview mode to surface the buy wall */
  requestUpgrade: () => void;
  /**
   * Phase 7 AI proxy client — present for every module, but only apps with
   * requiresAi should depend on it. Always server-backed (never a local
   * fake): preview users get a metered free allowance, and the module must
   * render the sign_in_required / preview_exhausted / unavailable results.
   */
  ai?: AiClient;
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
  /** this app's own visual identity — see @vault/module-ui for the primitives that use it */
  theme?: ModuleTheme;
}

export function defineModule(manifest: ModuleManifest): ModuleManifest {
  return manifest;
}

export { createStoreClient } from './store';
export type { StoreClient, StoreDoc } from './store';
export { createAiClient } from './ai';
export type { AiClient, AiMessage, AiCompleteOpts, AiResult } from './ai';
export { CATEGORY_ACCENTS } from './theme';
export type { ModuleCategory, ModuleTheme } from './theme';
