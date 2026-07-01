export type StoreDoc<T = unknown> = { docId: string; data: T; updatedAt?: string };

export interface StoreClient {
  list<T = unknown>(collection: string): Promise<StoreDoc<T>[]>;
  get<T = unknown>(collection: string, docId: string): Promise<StoreDoc<T> | null>;
  create<T = unknown>(collection: string, data: T, docId?: string): Promise<StoreDoc<T>>;
  update<T = unknown>(collection: string, docId: string, data: T): Promise<StoreDoc<T>>;
  remove(collection: string, docId: string): Promise<void>;
}

type CreateStoreClientOpts = {
  mode: 'preview' | 'full';
  moduleSlug: string;
  /** full mode only */
  apiBaseUrl?: string;
  /** full mode only — resolves the bearer token for the signed-in user */
  getToken?: () => Promise<string | undefined> | string | undefined;
  /** preview mode only — starting demo data, from the module's seedPreview() */
  seed?: Record<string, unknown[]>;
};

/**
 * Preview mode never touches the network or the real database — everything
 * lives in a Map that disappears on refresh. This is the client-side half of
 * the buy wall: the server-side half (apps/api/src/routes/store.ts) is what
 * actually enforces it, this just gives preview users something to play with.
 */
function createEphemeralStore(seed: Record<string, unknown[]>): StoreClient {
  const collections = new Map<string, Map<string, unknown>>();
  for (const [collection, docs] of Object.entries(seed)) {
    const map = new Map<string, unknown>();
    docs.forEach((data, i) => map.set(String(i), data));
    collections.set(collection, map);
  }

  const of = (collection: string) => {
    if (!collections.has(collection)) collections.set(collection, new Map());
    return collections.get(collection)!;
  };

  return {
    async list(collection) {
      return Array.from(of(collection).entries()).map(([docId, data]) => ({ docId, data })) as StoreDoc<never>[];
    },
    async get(collection, docId) {
      const data = of(collection).get(docId);
      return data === undefined ? null : ({ docId, data } as StoreDoc<never>);
    },
    async create(collection, data, docId) {
      const id = docId ?? crypto.randomUUID();
      of(collection).set(id, data);
      return { docId: id, data } as StoreDoc<never>;
    },
    async update(collection, docId, data) {
      of(collection).set(docId, data);
      return { docId, data } as StoreDoc<never>;
    },
    async remove(collection, docId) {
      of(collection).delete(docId);
    },
  };
}

function createRemoteStore(opts: CreateStoreClientOpts): StoreClient {
  const base = () => `${opts.apiBaseUrl}/store/${opts.moduleSlug}`;
  async function authedFetch(path: string, init?: RequestInit) {
    const token = await opts.getToken?.();
    const headers = new Headers(init?.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');
    const res = await fetch(path, { ...init, headers });
    // Access is enforced server-side (403 if unentitled) — this is UX only.
    if (!res.ok && res.status !== 404) throw new Error(`Store request failed: ${res.status}`);
    return res;
  }

  return {
    async list(collection) {
      const res = await authedFetch(`${base()}/${collection}`);
      return res.json();
    },
    async get(collection, docId) {
      const res = await authedFetch(`${base()}/${collection}/${docId}`);
      return res.status === 404 ? null : res.json();
    },
    async create(collection, data, docId) {
      const res = await authedFetch(`${base()}/${collection}`, {
        method: 'POST',
        body: JSON.stringify({ docId, data }),
      });
      return res.json();
    },
    async update(collection, docId, data) {
      const res = await authedFetch(`${base()}/${collection}/${docId}`, {
        method: 'PUT',
        body: JSON.stringify({ data }),
      });
      return res.json();
    },
    async remove(collection, docId) {
      await authedFetch(`${base()}/${collection}/${docId}`, { method: 'DELETE' });
    },
  };
}

export function createStoreClient(opts: CreateStoreClientOpts): StoreClient {
  return opts.mode === 'preview' ? createEphemeralStore(opts.seed ?? {}) : createRemoteStore(opts);
}
