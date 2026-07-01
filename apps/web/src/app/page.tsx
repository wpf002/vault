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
