import { defineModule } from '@vault/module-sdk';
import { ReferralTrackingDashboard } from './ReferralTrackingDashboard';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'referral-tracking',
  name: 'Referral Tracking Dashboard',
  Component: ReferralTrackingDashboard,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#34c1eb' },
});
