import { defineModule } from '@vault/module-sdk';
import { CommunityMembershipPortal } from './CommunityMembershipPortal';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'community-membership-portal',
  name: 'Community Membership Portal',
  Component: CommunityMembershipPortal,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#ff6b9d' },
});
