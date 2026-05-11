import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { createSessionToken, setSessionCookie } from '@/lib/auth-session';
import { isPasswordValid } from '@/lib/auth-validation';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getSessionUser } from '@/lib/session-user';
import { findUserById, mapStoredUserToPublic, updateUserEmail, updateUserPassword } from '@/lib/user-store';

type AccountPatchBody = {
  email?: string;
  currentPassword?: string;
  newPassword?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Требуется авторизация.' }, { status: 401 });
  }

  const limit = checkRateLimit({
    key: `account:${sessionUser.id}:${getClientIp(request)}`,
    limit: 8,
    windowMs: 15 * 60 * 1000,
  });
  if (limit.limited) {
    return rateLimitResponse(limit.retryAfter);
  }

  let body: AccountPatchBody;
  try {
    body = (await request.json()) as AccountPatchBody;
  } catch {
    return NextResponse.json({ message: 'Некорректный JSON.' }, { status: 400 });
  }

  const user = await findUserById(sessionUser.id);
  if (!user) {
    return NextResponse.json({ message: 'Пользователь не найден.' }, { status: 404 });
  }

  const currentPassword = body.currentPassword ?? '';
  if (!currentPassword) {
    return NextResponse.json({ message: 'Введите текущий пароль.' }, { status: 400 });
  }

  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isCurrentPasswordValid) {
    return NextResponse.json({ message: 'Текущий пароль указан неверно.' }, { status: 403 });
  }

  const nextEmail = body.email?.trim().toLowerCase();
  const nextPassword = body.newPassword ?? '';
  let updatedUser = user;

  if (nextEmail && nextEmail !== user.email) {
    if (!EMAIL_PATTERN.test(nextEmail)) {
      return NextResponse.json({ message: 'Введите корректный email.' }, { status: 400 });
    }

    try {
      updatedUser = await updateUserEmail(user.id, nextEmail);
    } catch (error) {
      if ((error as Error).message === 'EMAIL_IN_USE') {
        return NextResponse.json({ message: 'Пользователь с таким email уже существует.' }, { status: 409 });
      }
      throw error;
    }
  }

  if (nextPassword) {
    if (!isPasswordValid(nextPassword)) {
      return NextResponse.json({
        message: 'Новый пароль должен быть не короче 8 символов и содержать заглавную букву, строчную букву, цифру и спецсимвол.',
      }, { status: 400 });
    }

    await updateUserPassword(user.id, await bcrypt.hash(nextPassword, 10));
  }

  const publicUser = mapStoredUserToPublic(updatedUser);
  await setSessionCookie(await createSessionToken(publicUser));

  return NextResponse.json({
    user: publicUser,
    profile: updatedUser.profile,
    message: 'Настройки аккаунта сохранены.',
  });
}
