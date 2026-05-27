import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-user';
import { findUserByUsername, mapStoredUserToPublic } from '@/lib/user-store';
import { listUserWorks } from '@/lib/work-store';

type RouteProps = {
  params: Promise<{
    username: string;
  }>;
};

export async function GET(_: Request, { params }: RouteProps) {
  const { username } = await params;

  const profileUser = await findUserByUsername(username);
  if (!profileUser) {
    return NextResponse.json({ message: 'Профиль не найден.' }, { status: 404 });
  }

  const sessionUser = await getSessionUser();
  const isOwner = sessionUser?.id === profileUser.id;
  const works = await listUserWorks(profileUser.id, sessionUser?.id);
  const profile = {
    ...profileUser.profile,
    publicEmail: isOwner || profileUser.profile.showPublicEmail ? profileUser.profile.publicEmail : '',
  };

  return NextResponse.json({
    user: mapStoredUserToPublic(profileUser),
    profile,
    works,
    isOwner,
    authenticated: Boolean(sessionUser),
  });
}
