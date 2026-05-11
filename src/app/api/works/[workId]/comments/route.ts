import { NextResponse } from 'next/server';
import { createActivityNotification } from '@/lib/notification-store';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getSessionUser } from '@/lib/session-user';

type RouteParams = {
  params: Promise<{ workId: string }>;
};

type CommentBody = {
  text?: string;
};

export async function POST(request: Request, { params }: RouteParams) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: 'Требуется авторизация.' }, { status: 401 });
  }

  const limit = checkRateLimit({
    key: `comment:${user.id}`,
    limit: 30,
    windowMs: 15 * 60 * 1000,
  });
  if (limit.limited) {
    return rateLimitResponse(limit.retryAfter);
  }

  const { workId } = await params;
  const id = Number(workId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ message: 'Некорректный идентификатор работы.' }, { status: 400 });
  }

  let body: CommentBody;
  try {
    body = (await request.json()) as CommentBody;
  } catch {
    return NextResponse.json({ message: 'Некорректный JSON.' }, { status: 400 });
  }

  const text = body.text?.trim() ?? '';
  if (text.length < 2 || text.length > 600) {
    return NextResponse.json({ message: 'Комментарий должен быть от 2 до 600 символов.' }, { status: 400 });
  }

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

  const comment = await prisma.workComment.create({
    data: {
      userId: user.id,
      workId: id,
      text,
    },
    include: {
      user: {
        select: {
          username: true,
          profile: { select: { nickname: true } },
        },
      },
    },
  });

  if (work.authorId !== user.id) {
    await createActivityNotification({
      recipientId: work.authorId,
      actorId: user.id,
      actorName: comment.user.profile?.nickname || comment.user.username,
      type: 'comment',
      workId: id,
      workTitle: work.title,
    });
  }

  return NextResponse.json({
    comment: {
      id: comment.id,
      author: comment.user.profile?.nickname || comment.user.username,
      authorUsername: comment.user.username,
      text: comment.text,
      postedAt: new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(comment.createdAt),
    },
  }, { status: 201 });
}
