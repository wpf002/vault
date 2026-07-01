import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@vault/db';

export async function POST(req: Request) {
  const { email, password, name } = await req.json();
  if (typeof email !== 'string' || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Email and an 8+ character password are required.' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'An account with that email already exists.' }, { status: 409 });
  }

  const passwordHash = await hash(password, 12);
  await prisma.user.create({ data: { email, passwordHash, name: typeof name === 'string' ? name : undefined } });

  return NextResponse.json({ ok: true });
}
