import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { createSessionToken, setSessionCookie } from '@/lib/auth-session';
import { isPasswordValid, isUsernameValid } from '@/lib/auth-validation';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { createUser } from '@/lib/user-store';

type RegisterBody = {
  username?: string;
  email?: string;
  password?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit({
    key: `register:${ip}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (limit.limited) {
    return rateLimitResponse(limit.retryAfter);
  }

  let body: RegisterBody;

  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ message: 'Некорректный JSON.' }, { status: 400 });
  }

  const username = body.username?.trim() ?? '';
  const email = body.email?.trim().toLowerCase() ?? '';
  const password = body.password ?? '';

  if (!isUsernameValid(username)) {
    return NextResponse.json({ message: 'Имя пользователя: 2-24 символа, латиница, цифры или _.' }, { status: 400 });
  }

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ message: 'Введите корректный email.' }, { status: 400 });
  }

  if (!isPasswordValid(password)) {
    return NextResponse.json({ message: 'Пароль должен быть не короче 8 символов и содержать заглавную букву, строчную букву, цифру и спецсимвол.' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const user = await createUser({ username, email, passwordHash });
    const token = await createSessionToken(user);
    await setSessionCookie(token);

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if ((error as Error).message === 'EMAIL_IN_USE') {
      return NextResponse.json({ message: 'Пользователь с таким email уже существует.' }, { status: 409 });
    }
    if ((error as Error).message === 'USERNAME_IN_USE') {
      return NextResponse.json({ message: 'Имя пользователя уже занято.' }, { status: 409 });
    }

    return NextResponse.json({ message: 'Не удалось создать пользователя.' }, { status: 500 });
  }
}
