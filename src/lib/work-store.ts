import { ensureDatabaseSchema } from '@/lib/db-bootstrap';
import { prisma } from '@/lib/prisma';

export type UserWork = {
  id: number;
  title: string;
  category: string;
  featured?: boolean;
};

const defaultWorks = (username: string): UserWork[] => [
  { id: 1, title: `${username} Work 1`, category: 'Иллюстрация', featured: true },
  { id: 2, title: `${username} Work 2`, category: 'Иллюстрация', featured: true },
  { id: 3, title: `${username} Work 3`, category: 'UI/UX', featured: true },
  { id: 4, title: `${username} Work 4`, category: 'Дизайн сайтов', featured: true },
  { id: 5, title: `${username} Work 5`, category: 'Иллюстрация' },
  { id: 6, title: `${username} Work 6`, category: 'Иллюстрация' },
  { id: 7, title: `${username} Work 7`, category: 'Fan art' },
  { id: 8, title: `${username} Work 8`, category: 'Дизайн сайтов' },
];

const mapWork = (work: {
  externalId: number;
  title: string;
  category: string;
  featured: boolean;
}): UserWork => ({
  id: work.externalId,
  title: work.title,
  category: work.category,
  featured: work.featured,
});

export const listUserWorks = async (userId: string, username: string): Promise<UserWork[]> => {
  await ensureDatabaseSchema();
  const existing = await prisma.work.findMany({
    where: { userId },
    orderBy: { externalId: 'asc' },
    select: {
      externalId: true,
      title: true,
      category: true,
      featured: true,
    },
  });

  if (existing.length > 0) {
    return existing.map(mapWork);
  }

  const seeded = defaultWorks(username);
  await prisma.work.createMany({
    data: seeded.map((item) => ({
      userId,
      externalId: item.id,
      title: item.title,
      category: item.category,
      featured: Boolean(item.featured),
    })),
  });

  return seeded;
};
