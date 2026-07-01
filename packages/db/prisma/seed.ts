// Seeds all 121 modules as `coming_soon` rows so the catalog is populated
// day one. Flip individual modules to `live` as you build them.
// The full catalog lives in modules.catalog.ts (generate from the 121 list).
import { prisma } from '../src';
import { CATALOG } from './modules.catalog';

async function main() {
  for (const m of CATALOG) {
    await prisma.module.upsert({
      where: { slug: m.slug },
      update: {
        name: m.name,
        description: m.description,
        category: m.category,
        requiresAi: m.requiresAi ?? false,
      },
      create: {
        slug: m.slug,
        number: m.number,
        name: m.name,
        description: m.description,
        category: m.category,
        requiresAi: m.requiresAi ?? false,
        status: 'coming_soon',
        priceCents: 900,
      },
    });
  }
  console.log(`seeded ${CATALOG.length} modules`);
}

main().finally(() => prisma.$disconnect());
