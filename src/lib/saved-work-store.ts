import { ensureDatabaseSchema } from '@/lib/db-bootstrap';
import { prisma } from '@/lib/prisma';
import type { SavedWorkItem, SavedWorkKind } from '@/lib/saved-work-types';

const mapSavedWork = (item: {
  kind: SavedWorkKind;
  targetId: number;
  savedAt: Date;
}): SavedWorkItem => ({
  kind: item.kind,
  id: item.targetId,
  savedAt: item.savedAt.toISOString(),
});

export const listSavedWorks = async (userId: string): Promise<SavedWorkItem[]> => {
  await ensureDatabaseSchema();
  const items = await prisma.savedWork.findMany({
    where: { userId },
    orderBy: { savedAt: 'desc' },
    select: {
      kind: true,
      targetId: true,
      savedAt: true,
    },
  });

  return items.map(mapSavedWork);
};

export const saveWork = async (userId: string, kind: SavedWorkKind, id: number): Promise<SavedWorkItem[]> => {
  await ensureDatabaseSchema();
  await prisma.savedWork.upsert({
    where: {
      userId_kind_targetId: {
        userId,
        kind,
        targetId: id,
      },
    },
    update: {},
    create: {
      userId,
      kind,
      targetId: id,
    },
  });

  return listSavedWorks(userId);
};

export const removeWork = async (userId: string, kind: SavedWorkKind, id: number): Promise<SavedWorkItem[]> => {
  await ensureDatabaseSchema();
  await prisma.savedWork.deleteMany({
    where: {
      userId,
      kind,
      targetId: id,
    },
  });

  return listSavedWorks(userId);
};
