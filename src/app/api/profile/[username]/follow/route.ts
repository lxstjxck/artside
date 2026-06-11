import { NextResponse } from 'next/server';
import { ensureDatabaseSchema } from '@/lib/db-bootstrap';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getSessionUser } from '@/lib/session-user';

type RouteParams = {
  params: Promise<{ username: string }>;
};

const getTargetUser = async (username: string) => {
  return prisma.user.findFirst({
    where: { username },
    select: {
      id: true,
      username: true,
    },
  });
};

const getFollowersCount = (followingId: string) => {
  return prisma.userFollow.count({ where: { followingId } });
};

export async function POST(_: Request, { params }: RouteParams) {
  await ensureDatabaseSchema();

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: 'Требуется авторизация.' }, { status: 401 });
  }

  const limit = checkRateLimit({
    key: `follow:${user.id}`,
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limit.limited) {
    return rateLimitResponse(limit.retryAfter);
  }

  const { username } = await params;
  const target = await getTargetUser(username);
  if (!target) {
    return NextResponse.json({ message: 'Автор не найден.' }, { status: 404 });
  }

  if (target.id === user.id) {
    return NextResponse.json({ message: 'Нельзя подписаться на свой профиль.' }, { status: 400 });
  }

  await prisma.userFollow.upsert({
    where: {
      followerId_followingId: {
        followerId: user.id,
        followingId: target.id,
      },
    },
    update: {},
    create: {
      followerId: user.id,
      followingId: target.id,
    },
  });

  return NextResponse.json({
    following: true,
    followers: await getFollowersCount(target.id),
  });
}

export async function DELETE(_: Request, { params }: RouteParams) {
  await ensureDatabaseSchema();

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: 'Требуется авторизация.' }, { status: 401 });
  }

  const limit = checkRateLimit({
    key: `follow:${user.id}`,
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limit.limited) {
    return rateLimitResponse(limit.retryAfter);
  }

  const { username } = await params;
  const target = await getTargetUser(username);
  if (!target) {
    return NextResponse.json({ message: 'Автор не найден.' }, { status: 404 });
  }

  await prisma.userFollow.deleteMany({
    where: {
      followerId: user.id,
      followingId: target.id,
    },
  });

  return NextResponse.json({
    following: false,
    followers: await getFollowersCount(target.id),
  });
}
