import { getSession } from 'next-auth/react';

/** Calls the Fastify API with the current session's bearer token attached. */
export async function apiFetch(path: string, init?: RequestInit) {
  const session = await getSession();
  const headers = new Headers(init?.headers);
  if (session?.apiToken) headers.set('Authorization', `Bearer ${session.apiToken}`);
  return fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, { ...init, headers });
}
