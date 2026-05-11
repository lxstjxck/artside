import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { createSessionToken, setSessionCookie } from '@/lib/auth-session';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { findUserByEmail, mapStoredUserToPublic } from '@/lib/user-store';

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit({
    key: `login:${ip}`,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (limit.limited) {
    return rateLimitResponse(limit.retryAfter);
  }

  let body: LoginBody;

  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ message: 'Некорректный JSON.' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? '';
  const password = body.password ?? '';

  if (!email || !password) {
    return NextResponse.json({ message: 'Email и пароль обязательны.' }, { status: 400 });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return NextResponse.json({ message: 'Неверный email или пароль.' }, { status: 401 });
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    return NextResponse.json({ message: 'Неверный email или пароль.' }, { status: 401 });
  }

  const publicUser = mapStoredUserToPublic(user);
  const token = await createSessionToken(publicUser);
  await setSessionCookie(token);

  return NextResponse.json({ user: publicUser });
}
