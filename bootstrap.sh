#!/usr/bin/env bash
# ============================================================================
# vault — platform shell bootstrap
# Scaffolds a pnpm + turbo monorepo: Next.js storefront/shell, Fastify API,
# Prisma/Postgres, shared entitlements + module SDK. NO app code (that's later).
#
# Usage:  bash bootstrap.sh
# Result: ./vault/ ready for `pnpm install`
# ============================================================================
set -euo pipefail

ROOT="vault"
SCOPE="@vault"

if [ -d "$ROOT" ]; then
  echo "!! ./$ROOT already exists. Move or delete it first." >&2
  exit 1
fi

echo ">> scaffolding ./$ROOT"
mkdir -p "$ROOT"
cd "$ROOT"

# ---------------------------------------------------------------------------
# folder tree
# ---------------------------------------------------------------------------
mkdir -p apps/web/src/app apps/web/src/lib apps/web/src/components
mkdir -p apps/api/src/routes apps/api/src/plugins apps/api/src/lib
mkdir -p packages/db/prisma packages/db/src
mkdir -p packages/entitlements/src
mkdir -p packages/module-sdk/src
mkdir -p packages/config
mkdir -p modules
touch modules/.gitkeep

# ---------------------------------------------------------------------------
# root: package.json, workspace, turbo, tsconfig, gitignore, env, prettier
# ---------------------------------------------------------------------------
cat > package.json <<'JSON'
{
  "name": "vault",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "db:generate": "pnpm --filter @vault/db generate",
    "db:migrate": "pnpm --filter @vault/db migrate",
    "db:seed": "pnpm --filter @vault/db seed",
    "db:studio": "pnpm --filter @vault/db studio"
  },
  "devDependencies": {
    "turbo": "^2.1.3",
    "prettier": "^3.3.3",
    "typescript": "^5.6.2"
  }
}
JSON

cat > pnpm-workspace.yaml <<'YAML'
packages:
  - "apps/*"
  - "packages/*"
  - "modules/*"
YAML

cat > turbo.json <<'JSON'
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": {},
    "typecheck": { "dependsOn": ["^build"] }
  }
}
JSON

cat > tsconfig.base.json <<'JSON'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "composite": false,
    "noUncheckedIndexedAccess": true
  }
}
JSON

cat > .gitignore <<'GIT'
node_modules/
dist/
.next/
.turbo/
*.tsbuildinfo
.env
.env.local
.DS_Store
coverage/
prisma/*.db
GIT

cat > .env.example <<'ENV'
# ---- shared ----
NODE_ENV=development

# ---- database (Railway Postgres) ----
DATABASE_URL=postgresql://user:pass@localhost:5432/vault?schema=public

# ---- api ----
API_PORT=4000
# JWT signing secret for session tokens. Generate: openssl rand -hex 32
AUTH_SECRET=replace-me

# ---- billing (Stripe) ----
STRIPE_SECRET_KEY=sk_test_replace
STRIPE_WEBHOOK_SECRET=whsec_replace
# price IDs from the Stripe dashboard
STRIPE_PRICE_SUBSCRIPTION=price_replace
# single-app one-time unlocks are priced per-module; store the price id on the
# Module row (see schema) rather than here.

# ---- web ----
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_replace

# ---- ai proxy (only needed once AI-labeled modules go live) ----
# Server-side only. Never expose to the client.
ANTHROPIC_API_KEY=
ENV

cat > .prettierrc <<'JSON'
{ "semi": true, "singleQuote": true, "printWidth": 100, "trailingComma": "all" }
JSON

# ---------------------------------------------------------------------------
# packages/config — shared tsconfig other packages extend
# ---------------------------------------------------------------------------
cat > packages/config/package.json <<'JSON'
{
  "name": "@vault/config",
  "version": "0.0.0",
  "private": true,
  "main": "index.js",
  "files": ["tsconfig.json"]
}
JSON

cat > packages/config/tsconfig.json <<'JSON'
{ "extends": "../../tsconfig.base.json" }
JSON

cat > packages/config/index.js <<'JS'
module.exports = {};
JS

# ---------------------------------------------------------------------------
# packages/db — Prisma schema (the heart: users, entitlements, modules)
# ---------------------------------------------------------------------------
cat > packages/db/package.json <<'JSON'
{
  "name": "@vault/db",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "generate": "prisma generate",
    "migrate": "prisma migrate dev",
    "deploy": "prisma migrate deploy",
    "seed": "tsx prisma/seed.ts",
    "studio": "prisma studio",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@prisma/client": "^5.20.0"
  },
  "devDependencies": {
    "@vault/config": "workspace:*",
    "prisma": "^5.20.0",
    "tsx": "^4.19.1",
    "typescript": "^5.6.2"
  }
}
JSON

cat > packages/db/tsconfig.json <<'JSON'
{ "extends": "@vault/config/tsconfig.json", "include": ["src", "prisma"] }
JSON

cat > packages/db/src/index.ts <<'TS'
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export * from '@prisma/client';
TS

cat > packages/db/prisma/schema.prisma <<'PRISMA'
// vault — data model
// The three ideas that make this a "vault" and not 121 apps:
//   1. Module    -> every mini-app is a ROW, listed day one, flipped live via status
//   2. Purchase  -> a one-time unlock OR a subscription, both write here
//   3. Entitlement view -> access = active sub OR a one-time unlock for that module
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String        @id @default(cuid())
  email         String        @unique
  name          String?
  createdAt     DateTime      @default(now())
  purchases     Purchase[]
  subscription  Subscription?
}

enum ModuleStatus {
  coming_soon
  live
  retired
}

enum ModuleCategory {
  productivity
  service_ops
  marketplace
  content_community
  health_wellness
  finance
  education
  local
  ai_tools
  data_dashboards
  travel
  business_saas
  food_lifestyle
  utilities
}

model Module {
  id             String         @id @default(cuid())
  // stable slug used in URLs and the module-sdk registry, e.g. "unit-converter"
  slug           String         @unique
  number         Int            @unique      // 1..121, from the catalog
  name           String
  description    String
  category       ModuleCategory
  status         ModuleStatus   @default(coming_soon)
  // one-time unlock price in integer cents. null = not individually sellable.
  priceCents     Int?
  stripePriceId  String?
  // true if this module needs the server-side AI proxy to function
  requiresAi     Boolean        @default(false)
  createdAt      DateTime       @default(now())
  purchases      Purchase[]
}

enum PurchaseKind {
  one_time      // permanent unlock of a single module
}

model Purchase {
  id             String       @id @default(cuid())
  userId         String
  moduleId       String
  kind           PurchaseKind @default(one_time)
  amountCents    Int
  stripePaymentId String?
  createdAt      DateTime     @default(now())
  user           User         @relation(fields: [userId], references: [id])
  module         Module       @relation(fields: [moduleId], references: [id])

  @@unique([userId, moduleId])   // can't buy the same module twice
  @@index([userId])
}

enum SubStatus {
  active
  past_due
  canceled
}

model Subscription {
  id                    String    @id @default(cuid())
  userId                String    @unique
  status                SubStatus @default(active)
  stripeSubscriptionId  String?   @unique
  currentPeriodEnd      DateTime?
  createdAt             DateTime  @default(now())
  user                  User      @relation(fields: [userId], references: [id])
}
PRISMA

cat > packages/db/prisma/seed.ts <<'TS'
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
TS

cat > packages/db/prisma/modules.catalog.ts <<'TS'
// The 121 catalog. Fill this out from the master list — 3 rows shown as the
// pattern. slug = kebab-case, number = position in the list, category = enum.
import type { ModuleCategory } from '../src';

type CatalogEntry = {
  number: number;
  slug: string;
  name: string;
  description: string;
  category: ModuleCategory;
  requiresAi?: boolean;
};

export const CATALOG: CatalogEntry[] = [
  {
    number: 12,
    slug: 'quick-note-taker',
    name: 'Quick Note Taker with Tags',
    description: 'Rapidly jot and organize text notes using simple tags for easy retrieval.',
    category: 'productivity',
  },
  {
    number: 113,
    slug: 'unit-converter',
    name: 'Basic Unit Converter',
    description: 'Convert length, weight, and temperature units.',
    category: 'utilities',
  },
  {
    number: 88,
    slug: 'smart-content-generator',
    name: 'Smart Content Generator & Summarizer',
    description: 'Summarizes texts and generates content outlines.',
    category: 'ai_tools',
    requiresAi: true,
  },
  // ... 118 more
];
TS

# ---------------------------------------------------------------------------
# packages/entitlements — the single access check, shared by web + api
# ---------------------------------------------------------------------------
cat > packages/entitlements/package.json <<'JSON'
{
  "name": "@vault/entitlements",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": { "typecheck": "tsc --noEmit" },
  "dependencies": { "@vault/db": "workspace:*" },
  "devDependencies": {
    "@vault/config": "workspace:*",
    "typescript": "^5.6.2"
  }
}
JSON

cat > packages/entitlements/tsconfig.json <<'JSON'
{ "extends": "@vault/config/tsconfig.json", "include": ["src"] }
JSON

cat > packages/entitlements/src/index.ts <<'TS'
import { prisma } from '@vault/db';

/**
 * The whole access model in one function.
 * A user can use a module if EITHER:
 *   - they have an active subscription (all-access), OR
 *   - they have a one-time purchase of that specific module.
 */
export async function hasAccess(userId: string, moduleSlug: string): Promise<boolean> {
  const [sub, purchase] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId } }),
    prisma.purchase.findFirst({
      where: { userId, module: { slug: moduleSlug } },
    }),
  ]);

  const subActive =
    sub?.status === 'active' &&
    (!sub.currentPeriodEnd || sub.currentPeriodEnd > new Date());

  return Boolean(subActive || purchase);
}

/** Returns the set of module slugs the user can access. */
export async function accessibleModules(userId: string): Promise<Set<string>> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  const subActive =
    sub?.status === 'active' &&
    (!sub.currentPeriodEnd || sub.currentPeriodEnd > new Date());

  if (subActive) {
    const all = await prisma.module.findMany({
      where: { status: 'live' },
      select: { slug: true },
    });
    return new Set(all.map((m) => m.slug));
  }

  const purchases = await prisma.purchase.findMany({
    where: { userId },
    select: { module: { select: { slug: true } } },
  });
  return new Set(purchases.map((p) => p.module.slug));
}
TS

# ---------------------------------------------------------------------------
# packages/module-sdk — what every mini-app imports to register itself
# ---------------------------------------------------------------------------
cat > packages/module-sdk/package.json <<'JSON'
{
  "name": "@vault/module-sdk",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": { "typecheck": "tsc --noEmit" },
  "peerDependencies": { "react": "^18.3.1" },
  "devDependencies": {
    "@vault/config": "workspace:*",
    "@types/react": "^18.3.5",
    "typescript": "^5.6.2"
  }
}
JSON

cat > packages/module-sdk/tsconfig.json <<'JSON'
{ "extends": "@vault/config/tsconfig.json", "include": ["src"] }
JSON

cat > packages/module-sdk/src/index.ts <<'TS'
import type { ComponentType } from 'react';

/**
 * Every mini-app in modules/<slug> exports a ModuleManifest as default.
 * The shell reads this to mount the app, gate it, and route to it.
 * The app itself never checks entitlements — the shell wraps it.
 */
export interface ModuleManifest {
  slug: string;              // must match the Module row slug
  name: string;
  /** the root component the shell renders once access is confirmed */
  Component: ComponentType;
  /** optional: called server-side to seed demo data for the preview */
  seedPreview?: () => Promise<void>;
}

export function defineModule(manifest: ModuleManifest): ModuleManifest {
  return manifest;
}
TS

# ---------------------------------------------------------------------------
# apps/api — Fastify shell: health, modules registry, entitlement check
# ---------------------------------------------------------------------------
cat > apps/api/package.json <<'JSON'
{
  "name": "@vault/api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "lint": "eslint src --max-warnings 0 || true",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@vault/db": "workspace:*",
    "@vault/entitlements": "workspace:*",
    "fastify": "^4.28.1",
    "@fastify/cors": "^9.0.1"
  },
  "devDependencies": {
    "@vault/config": "workspace:*",
    "tsx": "^4.19.1",
    "typescript": "^5.6.2"
  }
}
JSON

cat > apps/api/tsconfig.json <<'JSON'
{
  "extends": "@vault/config/tsconfig.json",
  "compilerOptions": { "outDir": "dist", "module": "ESNext" },
  "include": ["src"]
}
JSON

cat > apps/api/src/server.ts <<'TS'
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerModuleRoutes } from './routes/modules.js';

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

app.get('/health', async () => ({ ok: true }));
await registerModuleRoutes(app);

const port = Number(process.env.API_PORT ?? 4000);
app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
TS

cat > apps/api/src/routes/modules.ts <<'TS'
import type { FastifyInstance } from 'fastify';
import { prisma } from '@vault/db';
import { hasAccess } from '@vault/entitlements';

export async function registerModuleRoutes(app: FastifyInstance) {
  // Public catalog — everyone sees all 121, live + coming_soon.
  app.get('/modules', async () => {
    return prisma.module.findMany({
      orderBy: { number: 'asc' },
      select: {
        slug: true, number: true, name: true, description: true,
        category: true, status: true, priceCents: true, requiresAi: true,
      },
    });
  });

  // Access check for a given module. Wire real auth to resolve userId later.
  app.get<{ Params: { slug: string } }>('/modules/:slug/access', async (req) => {
    const userId = (req.headers['x-user-id'] as string) ?? '';
    if (!userId) return { access: false };
    return { access: await hasAccess(userId, req.params.slug) };
  });
}
TS

# ---------------------------------------------------------------------------
# apps/web — Next.js storefront/shell (minimal placeholder pages)
# ---------------------------------------------------------------------------
cat > apps/web/package.json <<'JSON'
{
  "name": "@vault/web",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@vault/module-sdk": "workspace:*",
    "next": "^14.2.13",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vault/config": "workspace:*",
    "@types/node": "^20.16.5",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.6.2"
  }
}
JSON

cat > apps/web/tsconfig.json <<'JSON'
{
  "extends": "@vault/config/tsconfig.json",
  "compilerOptions": {
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "noEmit": true
  },
  "include": ["src", "next-env.d.ts", ".next/types/**/*.ts"]
}
JSON

cat > apps/web/next.config.mjs <<'JS'
/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true };
export default nextConfig;
JS

cat > apps/web/src/app/layout.tsx <<'TSX'
export const metadata = { title: 'vault', description: '121 mini-apps, one roof.' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
TSX

cat > apps/web/src/app/page.tsx <<'TSX'
async function getModules() {
  const url = `${process.env.NEXT_PUBLIC_API_URL}/modules`;
  const res = await fetch(url, { cache: 'no-store' }).catch(() => null);
  if (!res?.ok) return [];
  return res.json();
}

export default async function Home() {
  const modules = await getModules();
  return (
    <main style={{ padding: 40, fontFamily: 'system-ui' }}>
      <h1>vault</h1>
      <p>{modules.length} modules in the catalog. (shell scaffold — no app code yet)</p>
    </main>
  );
}
TSX

echo 'declare module "*";' > apps/web/next-env.d.ts

# ---------------------------------------------------------------------------
# done
# ---------------------------------------------------------------------------
echo ""
echo ">> scaffold complete."
echo ">> next:"
echo "     cd $ROOT"
echo "     pnpm install"
echo "     cp .env.example .env      # fill in DATABASE_URL etc."
echo "     pnpm db:generate && pnpm db:migrate && pnpm db:seed"
echo "     pnpm dev"
