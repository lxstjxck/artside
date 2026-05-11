import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getSessionUser } from '@/lib/session-user';

type RouteParams = {
  params: Promise<{ workId: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const ip = getClientIp(request);
  const limit = checkRateLimit({
    key: `view:${ip}`,
    limit: 120,
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

  const user = await getSessionUser();
  const viewerKey = user ? null : ip;
  const since = new Date(Date.now() - 60 * 60 * 1000);

  const recentView = user
    ? await prisma.workView.findFirst({ where: { workId: id, userId: user.id, viewedAt: { gte: since } }, select: { id: true } })
    : await prisma.workView.findFirst({ where: { workId: id, viewerKey, viewedAt: { gte: since } }, select: { id: true } });

  if (!recentView) {
    await prisma.workView.create({
      data: {
        workId: id,
        userId: user?.id,
        viewerKey,
      },
    });
  }

  const views = await prisma.workView.count({ where: { workId: id } });
  return NextResponse.json({ views });
}
