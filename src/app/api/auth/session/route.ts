import { NextResponse } from 'next/server';
import { getSessionCookie, verifySessionToken } from '@/lib/auth-session';
import { findUserById, mapStoredUserToPublic } from '@/lib/user-store';

export async function GET() {
  const token = await getSessionCookie();
  if (!token) {
    return NextResponse.json({ authenticated: false });
  }

  const payload = await verifySessionToken(token);
  if (!payload) {
    return NextResponse.json({ authenticated: false });
  }

  const user = await findUserById(payload.sub);
  if (!user) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    user: mapStoredUserToPublic(user),
    profile: user.profile,
  });
}
