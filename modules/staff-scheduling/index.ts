import { defineModule } from '@vault/module-sdk';
import { StaffSchedulingTool } from './StaffSchedulingTool';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'staff-scheduling',
  name: 'Staff Scheduling Tool',
  Component: StaffSchedulingTool,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#34c1eb' },
});
