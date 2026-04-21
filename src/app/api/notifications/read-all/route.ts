import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-user';
import { markAllNotificationsAsRead } from '@/lib/notification-store';

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: 'Требуется авторизация.' }, { status: 401 });
  }

  const notifications = await markAllNotificationsAsRead(user.id);
  return NextResponse.json({ notifications });
}
