import { NextResponse } from 'next/server';
import { ensureDatabaseSchema } from '@/lib/db-bootstrap';
import { prisma } from '@/lib/prisma';

const searchWorkInclude = {
  author: {
    select: {
      username: true,
      profile: { select: { nickname: true } },
    },
  },
  _count: {
    select: {
      views: true,
      likes: true,
      savedBy: true,
    },
  },
};

type SearchWork = Awaited<ReturnType<typeof prisma.work.findMany>>[number] & {
  author: {
    username: string;
    profile: { nickname: string } | null;
  };
  _count: {
    views: number;
    likes: number;
    savedBy: number;
  };
};

const parseTags = (value: string | null) => (
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8)
);

const parseStoredTags = (value: string) => {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
      : [];
  } catch {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
};

const getSort = (value: string | null) => (
  value === 'popular' ? value : 'newest'
);

const getPopularityScore = (work: SearchWork) => (
  work._count.views * 0.25 + work._count.likes * 2 + work._count.savedBy * 3
);

export async function GET(request: Request) {
  await ensureDatabaseSchema();

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() ?? '';
  const category = searchParams.get('category')?.trim() ?? '';
  const tags = parseTags(searchParams.get('tags') ?? searchParams.get('tag'));
  const author = searchParams.get('author')?.trim() ?? '';
  const sort = getSort(searchParams.get('sort'));

  const items = await prisma.work.findMany({
    where: {
      status: 'published',
      ...(category ? { category } : {}),
      ...(tags.length > 0
        ? {
            AND: tags.map((tag) => ({
              tags: { contains: tag },
            })),
          }
        : {}),
      ...(author
        ? {
            author: {
              OR: [
                { username: { contains: author } },
                { profile: { nickname: { contains: author } } },
              ],
            },
          }
        : {}),
      ...(query.length >= 2
        ? {
            OR: [
              { title: { contains: query } },
              { description: { contains: query } },
              { category: { contains: query } },
              { tags: { contains: query } },
              { author: { username: { contains: query } } },
              { author: { profile: { nickname: { contains: query } } } },
            ],
          }
        : {}),
    },
    take: sort === 'popular' ? 80 : 48,
    orderBy: { createdAt: 'desc' },
    include: searchWorkInclude,
  });

  const sortedItems = sort === 'popular'
    ? [...items].sort((a, b) => getPopularityScore(b as SearchWork) - getPopularityScore(a as SearchWork)).slice(0, 48)
    : items;

  const facetWorks = await prisma.work.findMany({
    where: { status: 'published' },
    select: {
      category: true,
      tags: true,
      author: {
        select: {
          username: true,
          profile: { select: { nickname: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });

  const categoryCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();
  const authorCounts = new Map<string, { username: string; name: string; count: number }>();

  for (const work of facetWorks) {
    categoryCounts.set(work.category, (categoryCounts.get(work.category) ?? 0) + 1);
    for (const item of parseStoredTags(work.tags)) {
      tagCounts.set(item, (tagCounts.get(item) ?? 0) + 1);
    }
    const name = work.author.profile?.nickname || work.author.username;
    const current = authorCounts.get(work.author.username);
    authorCounts.set(work.author.username, {
      username: work.author.username,
      name,
      count: (current?.count ?? 0) + 1,
    });
  }

  return NextResponse.json({
    items: sortedItems.map((work) => ({
      id: work.id,
      title: work.title,
      category: work.category,
      imageUrl: work.thumbnailUrl || work.imageUrl,
      thumbnailUrl: work.thumbnailUrl,
      thumbnailWidth: work.thumbnailWidth,
      thumbnailHeight: work.thumbnailHeight,
      imageWidth: work.thumbnailWidth ?? work.imageWidth,
      imageHeight: work.thumbnailHeight ?? work.imageHeight,
      description: work.description,
      status: work.status,
      featured: work.featured,
      author: work.author.profile?.nickname || work.author.username,
      authorUsername: work.author.username,
      views: work._count.views,
      likes: work._count.likes,
      saves: work._count.savedBy,
      commentsCount: 0,
      tags: parseStoredTags(work.tags),
      createdAt: work.createdAt.toISOString(),
    })),
    filters: {
      categories: Array.from(categoryCounts, ([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        .slice(0, 24),
      tags: Array.from(tagCounts, ([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        .slice(0, 32),
      authors: Array.from(authorCounts.values())
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        .slice(0, 24),
    },
  });
}
