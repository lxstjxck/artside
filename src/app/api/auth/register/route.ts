import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { createSessionToken, setSessionCookie } from '@/lib/auth-session';
import { createUser } from '@/lib/user-store';

type RegisterBody = {
  username?: string;
  email?: string;
  password?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: RegisterBody;

  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ message: 'Некорректный JSON.' }, { status: 400 });
  }

  const username = body.username?.trim() ?? '';
  const email = body.email?.trim().toLowerCase() ?? '';
  const password = body.password ?? '';

  if (username.length < 2) {
    return NextResponse.json({ message: 'Имя пользователя слишком короткое.' }, { status: 400 });
  }

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ message: 'Некорректный email.' }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ message: 'Пароль должен быть не короче 8 символов.' }, { status: 400 });
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
