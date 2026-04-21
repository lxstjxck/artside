import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-user';
import { findUserById, mapStoredUserToPublic, updateUserProfile } from '@/lib/user-store';

type ProfilePatchBody = {
  nickname?: string;
  location?: string;
  bio?: string;
  avatarUrl?: string;
};

const trimValue = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const fullUser = await findUserById(sessionUser.id);
  if (!fullUser) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: mapStoredUserToPublic(fullUser),
    profile: fullUser.profile,
  });
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Требуется авторизация.' }, { status: 401 });
  }

  let body: ProfilePatchBody;
  try {
    body = (await request.json()) as ProfilePatchBody;
  } catch {
    return NextResponse.json({ message: 'Некорректный JSON.' }, { status: 400 });
  }

  const nextNickname = trimValue(body.nickname);
  const nextLocation = trimValue(body.location);
  const nextBio = trimValue(body.bio);
  const nextAvatarUrl = trimValue(body.avatarUrl);

  if (nextNickname.length < 2 || nextNickname.length > 40) {
    return NextResponse.json({ message: 'Никнейм должен быть от 2 до 40 символов.' }, { status: 400 });
  }

  if (nextLocation.length > 80) {
    return NextResponse.json({ message: 'Локация не должна превышать 80 символов.' }, { status: 400 });
  }

  if (nextBio.length > 600) {
    return NextResponse.json({ message: 'Описание не должно превышать 600 символов.' }, { status: 400 });
  }

  const updated = await updateUserProfile(sessionUser.id, {
    nickname: nextNickname,
    location: nextLocation || 'Не указано',
    bio: nextBio || 'Расскажите о себе в профиле.',
    avatarUrl: nextAvatarUrl,
  });

  if (!updated) {
    return NextResponse.json({ message: 'Пользователь не найден.' }, { status: 404 });
  }

  return NextResponse.json({
    profile: updated.profile,
    user: mapStoredUserToPublic(updated),
  });
}
