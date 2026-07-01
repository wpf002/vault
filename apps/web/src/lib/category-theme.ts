import { CATEGORY_ACCENTS, type ModuleCategory } from '@vault/module-sdk';

// A small emoji per category so catalog cards read as "a store", not a
// spreadsheet — cheap to keep up as new categories/modules are added.
const CATEGORY_ICONS: Record<ModuleCategory, string> = {
  productivity: '🗂️',
  service_ops: '🧾',
  marketplace: '🛒',
  content_community: '📣',
  health_wellness: '💚',
  finance: '💰',
  education: '🎓',
  local: '📍',
  ai_tools: '✨',
  data_dashboards: '📊',
  travel: '✈️',
  business_saas: '💼',
  food_lifestyle: '🍽️',
  utilities: '🛠️',
};

const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  productivity: 'Productivity',
  service_ops: 'Service Ops',
  marketplace: 'Marketplace',
  content_community: 'Content & Community',
  health_wellness: 'Health & Wellness',
  finance: 'Finance',
  education: 'Education',
  local: 'Local',
  ai_tools: 'AI Tools',
  data_dashboards: 'Data & Dashboards',
  travel: 'Travel',
  business_saas: 'Business & SaaS',
  food_lifestyle: 'Food & Lifestyle',
  utilities: 'Utilities',
};

const STATUS_LABELS: Record<string, string> = {
  live: 'Live',
  coming_soon: 'Coming Soon',
  retired: 'Retired',
};

export function categoryAccent(category: string): string {
  return CATEGORY_ACCENTS[category as ModuleCategory] ?? CATEGORY_ACCENTS.utilities;
}

/** Fallback icon when a module doesn't define its own — see @vault/module-sdk's per-module ICONS map. */
export function categoryIcon(category: string): string {
  return CATEGORY_ICONS[category as ModuleCategory] ?? '📦';
}

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category as ModuleCategory] ?? category;
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
