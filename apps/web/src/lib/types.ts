export type ModuleStatus = 'coming_soon' | 'live' | 'retired';

export type ModuleSummary = {
  slug: string;
  number: number;
  name: string;
  description: string;
  icon: string;
  category: string;
  status: ModuleStatus;
  priceCents: number | null;
  requiresAi: boolean;
};
