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

export function categoryAccent(category: string): string {
  return CATEGORY_ACCENTS[category as ModuleCategory] ?? CATEGORY_ACCENTS.utilities;
}

export function categoryIcon(category: string): string {
  return CATEGORY_ICONS[category as ModuleCategory] ?? '📦';
}
