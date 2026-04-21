import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-user';
import { listNotifications } from '@/lib/notification-store';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, notifications: [] });
  }

  const notifications = await listNotifications(user.id);
  return NextResponse.json({ authenticated: true, notifications });
}
