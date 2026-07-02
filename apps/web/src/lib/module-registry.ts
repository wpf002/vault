import type { ModuleManifest } from '@vault/module-sdk';

/**
 * slug -> dynamic import of modules/<slug>, imported by its workspace
 * package name (@vault/mod-<slug>), NOT a relative path — a bare relative
 * import can't resolve `react` or `@vault/*` since modules/<slug> has no
 * node_modules of its own. Next.js code-splits each entry, so the bundle
 * never balloons no matter how many of the 120 are live. Phase 5's
 * generator adds an entry here (and to next.config.mjs's transpilePackages)
 * for every module it scaffolds. Empty until then — the shell falls back
 * to a "not available yet" state for any slug with no entry.
 */
export const MODULE_REGISTRY: Record<string, () => Promise<{ default: ModuleManifest }>> = {
  'custom-client-portal': () => import('@vault/mod-custom-client-portal'),
  'flashcard-spaced-repetition': () => import('@vault/mod-flashcard-spaced-repetition'),
  'habit-tracker': () => import('@vault/mod-habit-tracker'),
  'minimalist-timer': () => import('@vault/mod-minimalist-timer'),
  'quick-note-taker': () => import('@vault/mod-quick-note-taker'),
  'unit-converter': () => import('@vault/mod-unit-converter'),
};
