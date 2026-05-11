import { NextResponse } from 'next/server';
import { getNotificationSettings, updateNotificationSettings } from '@/lib/notification-store';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getSessionUser } from '@/lib/session-user';

type NotificationSettingsBody = {
  notifyLikes?: boolean;
  notifyComments?: boolean;
  emailNotifications?: boolean;
};

const normalizeBoolean = (value: unknown, fallback: boolean) => (
  typeof value === 'boolean' ? value : fallback
);

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const settings = await getNotificationSettings(user.id);
  return NextResponse.json({
    authenticated: true,
    settings: settings ?? {
      notifyLikes: true,
      notifyComments: true,
      emailNotifications: false,
    },
  });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: 'Требуется авторизация.' }, { status: 401 });
  }

  const limit = checkRateLimit({
    key: `notification-settings:${user.id}`,
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (limit.limited) {
    return rateLimitResponse(limit.retryAfter);
  }

  let body: NotificationSettingsBody;
  try {
    body = (await request.json()) as NotificationSettingsBody;
  } catch {
    return NextResponse.json({ message: 'Некорректный JSON.' }, { status: 400 });
  }

  const current = await getNotificationSettings(user.id);
  const settings = await updateNotificationSettings(user.id, {
    notifyLikes: normalizeBoolean(body.notifyLikes, current?.notifyLikes ?? true),
    notifyComments: normalizeBoolean(body.notifyComments, current?.notifyComments ?? true),
    emailNotifications: normalizeBoolean(body.emailNotifications, current?.emailNotifications ?? false),
  });

  return NextResponse.json({ settings, message: 'Настройки уведомлений сохранены.' });
}
