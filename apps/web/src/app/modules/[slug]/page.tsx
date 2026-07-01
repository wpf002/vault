import { ModuleDetailClient } from './ModuleDetailClient';
import type { ModuleSummary } from '@/lib/types';

async function getModule(slug: string): Promise<ModuleSummary | null> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/modules/${slug}`, { cache: 'no-store' }).catch(
    () => null,
  );
  if (!res?.ok) return null;
  return res.json();
}

export default async function ModuleDetailPage({ params }: { params: { slug: string } }) {
  const module = await getModule(params.slug);
  if (!module) {
    return (
      <main style={{ padding: 'var(--space-5) var(--space-4)' }}>
        <p>Module not found.</p>
      </main>
    );
  }
  return <ModuleDetailClient module={module} />;
}
