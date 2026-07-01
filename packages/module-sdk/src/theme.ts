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
 */
export const CATEGORY_ACCENTS: Record<ModuleCategory, string> = {
  productivity: '#5b8cff',
  service_ops: '#34c1eb',
  marketplace: '#ff9f4a',
  content_community: '#ff6b9d',
  health_wellness: '#34d399',
  finance: '#f5c451',
  education: '#a78bfa',
  local: '#f87171',
  ai_tools: '#22d3ee',
  data_dashboards: '#818cf8',
  travel: '#38bdf8',
  business_saas: '#60a5fa',
  food_lifestyle: '#fb923c',
  utilities: '#9aa5b1',
};

export type ModuleTheme = {
  /** the one color that flavors this module's own buttons/highlights — a hex string */
  accent: string;
};
