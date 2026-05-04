import { ensureDatabaseSchema } from '@/lib/db-bootstrap';
import { prisma } from '@/lib/prisma';
import type { SavedWorkItem } from '@/lib/saved-work-types';

const mapSavedWork = (item: {
  workId: number;
  savedAt: Date;
  work?: {
    title: string;
    category: string;
    imageUrl: string;
    imageWidth: number;
    imageHeight: number;
    author: {
      username: string;
      profile: {
        nickname: string;
      } | null;
    };
  };
}): SavedWorkItem => ({
  id: item.workId,
  savedAt: item.savedAt.toISOString(),
  title: item.work?.title,
  category: item.work?.category,
  imageUrl: item.work?.imageUrl,
  imageWidth: item.work?.imageWidth,
  imageHeight: item.work?.imageHeight,
  author: item.work ? item.work.author.profile?.nickname || item.work.author.username : undefined,
});

export const listSavedWorks = async (userId: string): Promise<SavedWorkItem[]> => {
  await ensureDatabaseSchema();
  const items = await prisma.savedWork.findMany({
    where: { userId },
    orderBy: { savedAt: 'desc' },
    select: {
      workId: true,
      savedAt: true,
      work: {
        select: {
          title: true,
          category: true,
          imageUrl: true,
          imageWidth: true,
          imageHeight: true,
          author: {
            select: {
              username: true,
              profile: {
                select: {
                  nickname: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return items.map(mapSavedWork);
};

export const saveWork = async (userId: string, id: number): Promise<SavedWorkItem[]> => {
  await ensureDatabaseSchema();
  await prisma.savedWork.upsert({
    where: {
      userId_workId: {
        userId,
        workId: id,
      },
    },
    update: {},
    create: {
      userId,
      workId: id,
    },
  });

  return listSavedWorks(userId);
};

export const removeWork = async (userId: string, id: number): Promise<SavedWorkItem[]> => {
  await ensureDatabaseSchema();
  await prisma.savedWork.deleteMany({
    where: {
      userId,
      workId: id,
    },
  });

  return listSavedWorks(userId);
};
