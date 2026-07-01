import type { ModuleManifest } from '@vault/module-sdk';

/**
 * slug -> dynamic import of modules/<slug>. Next.js code-splits each entry,
 * so the bundle never balloons no matter how many of the 120 are live.
 * Phase 5's generator adds an entry here for every module it scaffolds;
 * Phase 6 fills them in one by one. Empty until then — the shell falls
 * back to a "not available yet" state for any slug with no entry.
 */
export const MODULE_REGISTRY: Record<string, () => Promise<{ default: ModuleManifest }>> = {
  // 'unit-converter': () => import('../../../../modules/unit-converter'),
};
