import { NextResponse } from 'next/server';
import { isMailConfigured, sendPasswordResetEmail } from '@/lib/mail';
import { createPasswordResetToken } from '@/lib/password-reset-store';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { findUserByEmail } from '@/lib/user-store';

type PasswordResetRequestBody = {
  email?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getResetUrl = (request: Request, token: string) => {
  const origin = process.env.APP_URL?.trim() || new URL(request.url).origin;
  return `${origin}/?resetToken=${encodeURIComponent(token)}`;
};

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit({
    key: `password-reset:${ip}`,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (limit.limited) {
    return rateLimitResponse(limit.retryAfter);
  }

  let body: PasswordResetRequestBody;

  try {
    body = (await request.json()) as PasswordResetRequestBody;
  } catch {
    return NextResponse.json({ message: 'Некорректный JSON.' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? '';
  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ message: 'Введите корректный email.' }, { status: 400 });
  }

  if (process.env.NODE_ENV === 'production' && !isMailConfigured()) {
    return NextResponse.json({ message: 'Почтовый сервис временно недоступен.' }, { status: 503 });
  }

  const user = await findUserByEmail(email);
  let devResetUrl: string | undefined;

  if (user) {
    const reset = await createPasswordResetToken(user.id);
    const resetUrl = getResetUrl(request, reset.token);
    if (process.env.NODE_ENV !== 'production') {
      devResetUrl = resetUrl;
    }

    if (isMailConfigured()) {
      await sendPasswordResetEmail({
        to: user.email,
        resetUrl,
      });
    }
  }

  return NextResponse.json({
    message: 'Если аккаунт с таким email существует, ссылка для восстановления будет отправлена.',
    devResetUrl,
  });
}
