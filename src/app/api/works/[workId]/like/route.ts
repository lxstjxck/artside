import { NextResponse } from 'next/server';
import { createActivityNotification } from '@/lib/notification-store';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getSessionUser } from '@/lib/session-user';

type RouteParams = {
  params: Promise<{ workId: string }>;
};

const parseWorkId = async (params: RouteParams['params']) => {
  const { workId } = await params;
  const id = Number(workId);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function POST(_: Request, { params }: RouteParams) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: 'Требуется авторизация.' }, { status: 401 });
  }

  const limit = checkRateLimit({
    key: `like:${user.id}`,
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limit.limited) {
    return rateLimitResponse(limit.retryAfter);
  }

  const id = await parseWorkId(params);
  if (!id) {
    return NextResponse.json({ message: 'Некорректный идентификатор работы.' }, { status: 400 });
  }

  const existingLike = await prisma.workLike.findUnique({
    where: { userId_workId: { userId: user.id, workId: id } },
    select: { id: true },
  });

  const work = await prisma.work.findUnique({
    where: { id },
    select: {
      title: true,
      authorId: true,
    },
  });

  if (!work) {
    return NextResponse.json({ message: 'Работа не найдена.' }, { status: 404 });
  }

  const like = await prisma.workLike.upsert({
    where: { userId_workId: { userId: user.id, workId: id } },
    update: {},
    create: { userId: user.id, workId: id },
  });

  if (!existingLike && like && work.authorId !== user.id) {
    const actor = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        username: true,
        profile: { select: { nickname: true } },
      },
    });

    await createActivityNotification({
      recipientId: work.authorId,
      actorId: user.id,
      actorName: actor?.profile?.nickname || actor?.username || user.username,
      type: 'like',
      workId: id,
      workTitle: work.title,
    });
  }

  const likes = await prisma.workLike.count({ where: { workId: id } });
  return NextResponse.json({ liked: true, likes });
}

export async function DELETE(_: Request, { params }: RouteParams) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: 'Требуется авторизация.' }, { status: 401 });
  }

  const limit = checkRateLimit({
    key: `like:${user.id}`,
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limit.limited) {
    return rateLimitResponse(limit.retryAfter);
  }

  const id = await parseWorkId(params);
  if (!id) {
    return NextResponse.json({ message: 'Некорректный идентификатор работы.' }, { status: 400 });
  }

  await prisma.workLike.deleteMany({ where: { userId: user.id, workId: id } });
  const likes = await prisma.workLike.count({ where: { workId: id } });
  return NextResponse.json({ liked: false, likes });
}
