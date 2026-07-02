import { defineModule } from '@vault/module-sdk';
import { CustomizablePersonalDashboard } from './CustomizablePersonalDashboard';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'personal-dashboard',
  name: 'Customizable Personal Dashboard',
  Component: CustomizablePersonalDashboard,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#2dd4bf' },
});
