import { defineModule } from '@vault/module-sdk';
import { InteractiveDataVisualizationDashboard } from './InteractiveDataVisualizationDashboard';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'data-visualization-dashboard',
  name: 'Interactive Data Visualization Dashboard',
  Component: InteractiveDataVisualizationDashboard,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#a3e635' },
});
