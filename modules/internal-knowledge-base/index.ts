import { defineModule } from '@vault/module-sdk';
import { InternalKnowledgeBaseTeamWiki } from './InternalKnowledgeBaseTeamWiki';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'internal-knowledge-base',
  name: 'Internal Knowledge Base / Team Wiki',
  Component: InternalKnowledgeBaseTeamWiki,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#2dd4bf' },
});
