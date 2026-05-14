import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session-user';
import { listHomeFeed } from '@/lib/home-feed';

const searchWorkInclude = {
  author: {
    select: {
      username: true,
      profile: { select: { nickname: true } },
    },
  },
} satisfies Prisma.WorkInclude;

type SearchWork = Prisma.WorkGetPayload<{ include: typeof searchWorkInclude }>;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() ?? '';

  if (query.length < 2) {
    return NextResponse.json({ items: [] });
  }

  const user = await getSessionUser();
  await listHomeFeed(user?.id);

  const items = await prisma.work.findMany({
    where: {
      OR: [
        { title: { contains: query } },
        { description: { contains: query } },
        { category: { contains: query } },
        { tags: { contains: query } },
        { author: { username: { contains: query } } },
        { author: { profile: { nickname: { contains: query } } } },
      ],
    },
    take: 12,
    orderBy: { createdAt: 'desc' },
    include: searchWorkInclude,
  });

  return NextResponse.json({
    items: items.map((work: SearchWork) => ({
      id: work.id,
      title: work.title,
      category: work.category,
      imageUrl: work.imageUrl,
      imageWidth: work.imageWidth,
      imageHeight: work.imageHeight,
      author: work.author.profile?.nickname || work.author.username,
      authorUsername: work.author.username,
    })),
  });
}
