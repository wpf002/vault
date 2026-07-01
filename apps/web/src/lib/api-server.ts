import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/** Server Component variant of apiFetch — reads the session via cookies, not the client hook. */
export async function apiFetchServer(path: string, init?: RequestInit) {
  const session = await getServerSession(authOptions);
  const headers = new Headers(init?.headers);
  if (session?.apiToken) headers.set('Authorization', `Bearer ${session.apiToken}`);
  return fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, { ...init, headers, cache: 'no-store' });
}
