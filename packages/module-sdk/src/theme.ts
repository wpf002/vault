export type ModuleCategory =
  | 'productivity'
  | 'service_ops'
  | 'marketplace'
  | 'content_community'
  | 'health_wellness'
  | 'finance'
  | 'education'
  | 'local'
  | 'ai_tools'
  | 'data_dashboards'
  | 'travel'
  | 'business_saas'
  | 'food_lifestyle'
  | 'utilities';

/**
 * Default accent per catalog category — the systematic answer to "every
 * app's look should fit its function": a finance app defaults to gold, a
 * health app to green, a utility to slate, etc. `gen:module` bakes the
 * matching color into a new module's manifest as `theme.accent`; any
 * module can override it for something more specific to what it does.
 *
 * None of these may sit near the shell's blue/violet gradient
 * (--color-accent #5b8cff / --color-accent-2 #b06bff, hues ~222°/268°) —
 * that range is reserved for platform chrome (DESIGN.md). productivity
 * used to be #5b8cff, an EXACT match; business_saas/data_dashboards/
 * education were all within ~13° hue of one of the two shell tones. Fixed
 * 2026-07-01 after noticing productivity's module accent would have been
 * pixel-identical to the shell's own CTA color for ~13 modules.
 */
export const CATEGORY_ACCENTS: Record<ModuleCategory, string> = {
  productivity: '#2dd4bf',
  service_ops: '#34c1eb',
  marketplace: '#ff9f4a',
  content_community: '#ff6b9d',
  health_wellness: '#34d399',
  finance: '#f5c451',
  education: '#e85d9e',
  local: '#f87171',
  ai_tools: '#22d3ee',
  data_dashboards: '#a3e635',
  travel: '#38bdf8',
  business_saas: '#8fae7f',
  food_lifestyle: '#fb923c',
  utilities: '#9aa5b1',
};

export type ModuleTheme = {
  /** the one color that flavors this module's own buttons/highlights — a hex string */
  accent: string;
};
