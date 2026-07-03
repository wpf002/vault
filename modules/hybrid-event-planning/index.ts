import { defineModule } from '@vault/module-sdk';
import { HybridEventPlanningExecutionPlatform } from './HybridEventPlanningExecutionPlatform';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'hybrid-event-planning',
  name: 'Hybrid Event Planning & Execution Platform',
  Component: HybridEventPlanningExecutionPlatform,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#8fae7f' },
});
