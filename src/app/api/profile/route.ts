import { NextResponse } from 'next/server';
import { getImageDimensions } from '@/lib/image-metadata';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getSessionUser } from '@/lib/session-user';
import { deleteWorkImage, uploadWorkImage } from '@/lib/work-image-storage';
import { findUserById, mapStoredUserToPublic, updateUserProfile } from '@/lib/user-store';
import { listUserWorks } from '@/lib/work-store';

type ProfilePatchBody = {
  nickname?: string;
  location?: string;
  bio?: string;
  avatarUrl?: string;
  avatarKey?: string | null;
};

const trimValue = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const MAX_AVATAR_SIZE = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const fullUser = await findUserById(sessionUser.id);
  if (!fullUser) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const works = await listUserWorks(fullUser.id, sessionUser.id);

  return NextResponse.json({
    authenticated: true,
    user: mapStoredUserToPublic(fullUser),
    profile: fullUser.profile,
    worksCount: works.length,
  });
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Требуется авторизация.' }, { status: 401 });
  }

  const limit = checkRateLimit({
    key: `profile:${sessionUser.id}`,
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (limit.limited) {
    return rateLimitResponse(limit.retryAfter);
  }

  const contentType = request.headers.get('content-type') ?? '';
  let body: ProfilePatchBody;
  let avatarFile: File | null = null;

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    body = {
      nickname: trimValue(formData.get('nickname')),
      location: trimValue(formData.get('location')),
      bio: trimValue(formData.get('bio')),
      avatarUrl: trimValue(formData.get('avatarUrl')),
    };
    const avatar = formData.get('avatar');
    avatarFile = avatar instanceof File && avatar.size > 0 ? avatar : null;
  } else {
    try {
      body = (await request.json()) as ProfilePatchBody;
    } catch {
      return NextResponse.json({ message: 'Некорректный JSON.' }, { status: 400 });
    }
  }

  const nextNickname = trimValue(body.nickname);
  const nextLocation = trimValue(body.location);
  const nextBio = trimValue(body.bio);
  let nextAvatarUrl = trimValue(body.avatarUrl);
  let nextAvatarKey = body.avatarKey ?? null;

  if (nextNickname.length < 2 || nextNickname.length > 40) {
    return NextResponse.json({ message: 'Никнейм должен быть от 2 до 40 символов.' }, { status: 400 });
  }

  if (nextLocation.length > 80) {
    return NextResponse.json({ message: 'Локация не должна превышать 80 символов.' }, { status: 400 });
  }

  if (nextBio.length > 600) {
    return NextResponse.json({ message: 'Описание не должно превышать 600 символов.' }, { status: 400 });
  }

  const existing = await findUserById(sessionUser.id);
  if (!existing) {
    return NextResponse.json({ message: 'Пользователь не найден.' }, { status: 404 });
  }

  if (avatarFile) {
    const extension = ALLOWED_IMAGE_TYPES.get(avatarFile.type);
    if (!extension) {
      return NextResponse.json({ message: 'Поддерживаются аватары JPG, PNG и WebP.' }, { status: 400 });
    }
    if (avatarFile.size > MAX_AVATAR_SIZE) {
      return NextResponse.json({ message: 'Размер аватара должен быть до 4 МБ.' }, { status: 400 });
    }

    const buffer = Buffer.from(await avatarFile.arrayBuffer());
    if (!getImageDimensions(buffer)) {
      return NextResponse.json({ message: 'Не удалось определить размеры аватара.' }, { status: 400 });
    }

    const storedAvatar = await uploadWorkImage({
      buffer,
      extension,
      contentType: avatarFile.type,
    });

    nextAvatarUrl = storedAvatar.url;
    nextAvatarKey = storedAvatar.key;
  }

  const updated = await updateUserProfile(sessionUser.id, {
    nickname: nextNickname,
    location: nextLocation || 'Не указано',
    bio: nextBio || 'Расскажите о себе в профиле.',
    avatarUrl: nextAvatarUrl,
    avatarKey: nextAvatarKey,
  });

  if (!updated) {
    return NextResponse.json({ message: 'Пользователь не найден.' }, { status: 404 });
  }

  if (avatarFile && existing.profile.avatarKey && existing.profile.avatarKey !== nextAvatarKey) {
    await deleteWorkImage(existing.profile.avatarKey);
  }

  return NextResponse.json({
    profile: updated.profile,
    user: mapStoredUserToPublic(updated),
  });
}
