import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session-user';

type RouteParams = {
  params: Promise<{ workId: string }>;
};

type FeaturedBody = {
  featured?: boolean;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: 'Требуется авторизация.' }, { status: 401 });
  }

  const { workId } = await params;
  const id = Number(workId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ message: 'Некорректный идентификатор работы.' }, { status: 400 });
  }

  const work = await prisma.work.findUnique({ where: { id }, select: { authorId: true } });
  if (!work) {
    return NextResponse.json({ message: 'Работа не найдена.' }, { status: 404 });
  }
  if (work.authorId !== user.id) {
    return NextResponse.json({ message: 'Можно закреплять только свои работы.' }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as FeaturedBody;
  const nextFeatured = Boolean(body.featured);

  if (nextFeatured) {
    const featuredCount = await prisma.work.count({ where: { authorId: user.id, featured: true, id: { not: id } } });
    if (featuredCount >= 4) {
      return NextResponse.json({ message: 'Можно закрепить не больше 4 работ.' }, { status: 400 });
    }
  }

  const updated = await prisma.work.update({
    where: { id },
    data: { featured: nextFeatured },
    select: { id: true, featured: true },
  });

  return NextResponse.json({ work: updated });
}
