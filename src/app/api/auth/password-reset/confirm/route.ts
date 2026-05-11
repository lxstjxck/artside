import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { isPasswordValid } from '@/lib/auth-validation';
import { clearSessionCookie } from '@/lib/auth-session';
import { findValidPasswordResetToken, markPasswordResetTokenUsed } from '@/lib/password-reset-store';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { updateUserPassword } from '@/lib/user-store';

type PasswordResetConfirmBody = {
  token?: string;
  password?: string;
};

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit({
    key: `password-reset-confirm:${ip}`,
    limit: 8,
    windowMs: 15 * 60 * 1000,
  });
  if (limit.limited) {
    return rateLimitResponse(limit.retryAfter);
  }

  let body: PasswordResetConfirmBody;

  try {
    body = (await request.json()) as PasswordResetConfirmBody;
  } catch {
    return NextResponse.json({ message: 'Некорректный JSON.' }, { status: 400 });
  }

  const token = body.token?.trim() ?? '';
  const password = body.password ?? '';

  if (!token) {
    return NextResponse.json({ message: 'Ссылка восстановления недействительна.' }, { status: 400 });
  }

  if (!isPasswordValid(password)) {
    return NextResponse.json({
      message: 'Пароль должен быть не короче 8 символов и содержать заглавную букву, строчную букву, цифру и спецсимвол.',
    }, { status: 400 });
  }

  const resetToken = await findValidPasswordResetToken(token);
  if (!resetToken) {
    return NextResponse.json({ message: 'Ссылка восстановления устарела или уже использована.' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await updateUserPassword(resetToken.userId, passwordHash);
  await markPasswordResetTokenUsed(resetToken.id);
  await clearSessionCookie();

  return NextResponse.json({ message: 'Пароль обновлен. Теперь можно войти с новым паролем.' });
}
