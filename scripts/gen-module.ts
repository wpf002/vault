#!/usr/bin/env tsx
/**
 * pnpm gen:module <slug>
 *
 * Stamps out modules/<slug>/ from the catalog entry that already exists in
 * packages/db/prisma/modules.catalog.ts (all 120 are pre-populated — this
 * repo doesn't need the generator to also invent name/category).
 *
 * Each module is a real pnpm workspace package (package.json + tsconfig),
 * not a bare source folder — a plain relative import from apps/web can't
 * resolve `react` or `@vault/*` because Node/webpack module resolution
 * walks up from the importing FILE's own directory, and modules/<slug> has
 * no node_modules of its own. Only a real workspace package gets one (via
 * pnpm's symlinks), so this is the only shape that actually mounts.
 *
 * Leaves the module's catalog `status` as coming_soon — flip it to live
 * yourself once the app actually satisfies modules/CONTRACT.md.
 *
 * Note on import extensions: everything this stamps out is bundled by
 * Next's webpack (via apps/web's transpilePackages), NOT run through the
 * tsx/Node-ESM loader apps/api uses — so relative imports here must be
 * extensionless (`./Foo`), not `.js`-suffixed like apps/api's convention.
 * Webpack doesn't do the tsx-style .js-resolves-to-.ts remap; getting this
 * wrong produces a "Module not found" only at Next dev-server runtime,
 * which `tsc --noEmit` does not catch.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG } from '../packages/db/prisma/modules.catalog.js';
import { CATEGORY_ACCENTS, type ModuleCategory } from '../packages/module-sdk/src/theme.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function fail(message: string): never {
  console.error(`gen:module — ${message}`);
  process.exit(1);
}

const slug = process.argv[2];
if (!slug) fail('usage: pnpm gen:module <slug>');

const entry = CATALOG.find((m) => m.slug === slug);
if (!entry) {
  fail(`"${slug}" isn't in the catalog (packages/db/prisma/modules.catalog.ts). Check the slug.`);
}

const moduleDir = resolve(ROOT, 'modules', slug);
if (existsSync(moduleDir)) fail(`modules/${slug} already exists — not overwriting it.`);

mkdirSync(moduleDir, { recursive: true });

const pascalName = entry.name
  .replace(/[^a-zA-Z0-9]+/g, ' ')
  .trim()
  .split(' ')
  .map((w) => w[0].toUpperCase() + w.slice(1))
  .join('');
const packageName = `@vault/mod-${slug}`;
const accent = CATEGORY_ACCENTS[entry.category as ModuleCategory] ?? CATEGORY_ACCENTS.utilities;

writeFileSync(
  resolve(moduleDir, 'package.json'),
  `${JSON.stringify(
    {
      name: packageName,
      version: '0.0.0',
      private: true,
      main: './index.ts',
      types: './index.ts',
      scripts: { typecheck: 'tsc --noEmit' },
      dependencies: {
        '@vault/module-sdk': 'workspace:*',
        '@vault/module-ui': 'workspace:*',
      },
      peerDependencies: { react: '^18.3.1' },
      devDependencies: {
        '@vault/config': 'workspace:*',
        '@types/react': '^18.3.5',
        typescript: '^5.6.2',
      },
    },
    null,
    2,
  )}\n`,
);

writeFileSync(
  resolve(moduleDir, 'tsconfig.json'),
  `{ "extends": "@vault/config/tsconfig.json", "compilerOptions": { "jsx": "react-jsx" }, "include": ["."] }\n`,
);

writeFileSync(
  resolve(moduleDir, 'seedPreview.ts'),
  `// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    items: [
      { title: 'Example item', note: 'Replace this with real ${entry.name} demo data.' },
    ],
  };
}
`,
);

writeFileSync(
  resolve(moduleDir, `${pascalName}.tsx`),
  `import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import { GatedAction, EmptyState, LoadingState, Section } from '@vault/module-ui';

type Item = { title: string; note: string };

// ${entry.name} — ${entry.description}
// Fill in the domain logic. Keep persistence on \`store\` and gated actions
// on GatedAction — see modules/CONTRACT.md and DESIGN.md before shipping
// this live. Don't pass className="primary" to GatedAction — it already
// renders themed off this module's own accent (index.ts's theme.accent);
// the shell's .primary class is the platform's own gradient, not this
// app's. Reach for @vault/module-ui's Input/Select/Label/StatDisplay/
// Divider as the domain logic grows — don't drop back to bare <input>/<ul>.
export function ${pascalName}({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    store.list<Item>('items').then((docs) => setItems(docs.map((d) => d.data)));
  }, [store]);

  if (items === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="${slug}-root">
      <Section title="${entry.name.replace(/'/g, "\\'")}">
        {items.length === 0 ? (
          <EmptyState icon="${entry.icon}">Nothing here yet.</EmptyState>
        ) : (
          <ul style={{ listStyle: 'none', margin: '0 0 12px', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {items.map((item, i) => (
              <li key={i} style={{ padding: '8px 10px', background: 'var(--color-bg)', borderRadius: 8 }}>
                {item.title}
              </li>
            ))}
          </ul>
        )}
        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={() => {}}>
          Export
        </GatedAction>
      </Section>
    </div>
  );
}
`,
);

writeFileSync(
  resolve(moduleDir, 'index.ts'),
  `import { defineModule } from '@vault/module-sdk';
import { ${pascalName} } from './${pascalName}';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: '${entry.slug}',
  name: '${entry.name.replace(/'/g, "\\'")}',
  Component: ${pascalName},
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '${accent}' },
});
`,
);

// apps/web must declare the new module as its own dependency — pnpm's
// strict node_modules only symlinks a workspace package into apps/web if
// apps/web's package.json actually lists it, regardless of it being a
// sibling workspace member.
const webPkgPath = resolve(ROOT, 'apps/web/package.json');
const webPkg = JSON.parse(readFileSync(webPkgPath, 'utf8'));
if (!webPkg.dependencies[packageName]) {
  webPkg.dependencies[packageName] = 'workspace:*';
  writeFileSync(webPkgPath, `${JSON.stringify(webPkg, null, 2)}\n`);
}

// Wire the new module into apps/web's registry, keyed by package name (not
// a relative path — see the note at the top of this file for why).
const registryPath = resolve(ROOT, 'apps/web/src/lib/module-registry.ts');
const registrySrc = readFileSync(registryPath, 'utf8');
const marker = 'export const MODULE_REGISTRY: Record<string, () => Promise<{ default: ModuleManifest }>> = {';
if (!registrySrc.includes(marker)) {
  fail('module-registry.ts has drifted from the expected shape — wire this module in by hand.');
}

// Ignore commented-out lines so a stray `// '<slug>': ...` example doesn't
// look like a real, already-wired entry.
const registryHasEntry = registrySrc
  .split('\n')
  .some((line) => !line.trim().startsWith('//') && line.includes(`'${slug}':`));

if (registryHasEntry) {
  console.log(`modules/${slug} scaffolded. Registry entry already present — nothing to wire.`);
} else {
  writeFileSync(
    registryPath,
    registrySrc.replace(marker, `${marker}\n  '${slug}': () => import('${packageName}'),`),
  );
}

// Next only transpiles workspace packages listed in transpilePackages —
// add this one if it's missing.
const nextConfigPath = resolve(ROOT, 'apps/web/next.config.mjs');
const nextConfigSrc = readFileSync(nextConfigPath, 'utf8');
if (!nextConfigSrc.includes(`'${packageName}'`)) {
  const patched = nextConfigSrc.includes('transpilePackages')
    ? nextConfigSrc.replace(/transpilePackages:\s*\[/, `transpilePackages: [\n    '${packageName}',`)
    : nextConfigSrc.replace(
        'const nextConfig = {',
        `const nextConfig = {\n  transpilePackages: ['${packageName}'],`,
      );
  writeFileSync(nextConfigPath, patched);
}

console.log(`
Scaffolded modules/${slug}/ (package "${packageName}") and wired it into
MODULE_REGISTRY + next.config.mjs's transpilePackages.

Next:
  1. Run \`pnpm install\` once so pnpm links the new workspace package.
  2. Build the actual feature in modules/${slug}/${pascalName}.tsx.
  3. Check it against modules/CONTRACT.md.
  4. Flip Module.status to 'live' for "${slug}" in the database when it's ready.
`);
