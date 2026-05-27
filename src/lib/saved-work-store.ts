import { ensureDatabaseSchema } from '@/lib/db-bootstrap';
import { prisma } from '@/lib/prisma';
import { LIKED_LIBRARY_FOLDER_ID, LIKED_LIBRARY_FOLDER_NAME } from '@/lib/saved-work-types';
import type { LibraryFolderItem, SavedWorkItem } from '@/lib/saved-work-types';

export const DEFAULT_LIBRARY_FOLDER_NAME = 'Избранное';

const mapSavedWork = (item: {
  workId: number;
  folderId?: number | null;
  savedAt: Date;
  work?: {
    title: string;
    category: string;
    imageUrl: string;
    imageWidth: number;
    imageHeight: number;
    thumbnailUrl?: string | null;
    thumbnailWidth?: number | null;
    thumbnailHeight?: number | null;
    author: {
      username: string;
      profile: {
        nickname: string;
      } | null;
    };
  };
}): SavedWorkItem => ({
  id: item.workId,
  folderId: item.folderId,
  savedAt: item.savedAt.toISOString(),
  title: item.work?.title,
  category: item.work?.category,
  imageUrl: item.work?.thumbnailUrl || item.work?.imageUrl,
  imageWidth: item.work?.thumbnailWidth ?? item.work?.imageWidth,
  imageHeight: item.work?.thumbnailHeight ?? item.work?.imageHeight,
  author: item.work ? item.work.author.profile?.nickname || item.work.author.username : undefined,
});

const isSystemFolderName = (name: string) => {
  const normalizedName = name.trim().toLowerCase();
  return normalizedName === DEFAULT_LIBRARY_FOLDER_NAME.toLowerCase()
    || normalizedName === LIKED_LIBRARY_FOLDER_NAME.toLowerCase();
};

export const ensureDefaultLibraryFolder = async (userId: string) => {
  await ensureDatabaseSchema();
  const legacyFolders = await prisma.libraryFolder.findMany({
    where: {
      userId,
      OR: [
        { name: DEFAULT_LIBRARY_FOLDER_NAME },
        { name: 'РР·Р±СЂР°РЅРЅРѕРµ' },
        { name: '?????????' },
      ],
    },
    orderBy: { id: 'asc' },
  });

  if (legacyFolders.length > 1) {
    const [targetFolder, ...duplicates] = legacyFolders;
    for (const duplicate of duplicates) {
      await prisma.savedWork.updateMany({
        where: { folderId: duplicate.id },
        data: { folderId: targetFolder.id },
      });
      await prisma.libraryFolder.delete({ where: { id: duplicate.id } });
    }
  }

  const legacyFolder = legacyFolders[0];
  if (legacyFolder && legacyFolder.name !== DEFAULT_LIBRARY_FOLDER_NAME) {
    await prisma.libraryFolder.update({
      where: { id: legacyFolder.id },
      data: { name: DEFAULT_LIBRARY_FOLDER_NAME },
    });
  }

  const folder = await prisma.libraryFolder.upsert({
    where: {
      userId_name: {
        userId,
        name: DEFAULT_LIBRARY_FOLDER_NAME,
      },
    },
    update: {},
    create: {
      userId,
      name: DEFAULT_LIBRARY_FOLDER_NAME,
      sortOrder: 0,
    },
  });

  await prisma.savedWork.updateMany({
    where: {
      userId,
      folderId: null,
    },
    data: {
      folderId: folder.id,
    },
  });

  return folder;
};

export const listLibraryFolders = async (userId: string): Promise<LibraryFolderItem[]> => {
  await ensureDefaultLibraryFolder(userId);
  const [folders, likedCount] = await Promise.all([
    prisma.libraryFolder.findMany({
    where: { userId },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    include: {
      _count: {
        select: {
          savedWorks: true,
        },
      },
    },
    }),
    prisma.workLike.count({ where: { userId } }),
  ]);

  const mappedFolders = folders.map((folder) => ({
    id: folder.id,
    name: folder.name,
    count: folder._count.savedWorks,
    sortOrder: folder.sortOrder,
    createdAt: folder.createdAt.toISOString(),
  }));

  return [
    ...mappedFolders.slice(0, 1),
    {
      id: LIKED_LIBRARY_FOLDER_ID,
      name: LIKED_LIBRARY_FOLDER_NAME,
      count: likedCount,
      sortOrder: 1,
      createdAt: new Date(0).toISOString(),
      system: true,
    },
    ...mappedFolders.slice(1),
  ];
};

export const createLibraryFolder = async (userId: string, name: string): Promise<LibraryFolderItem[]> => {
  await ensureDefaultLibraryFolder(userId);
  const normalizedName = name.trim().replace(/\s+/g, ' ').slice(0, 40);
  if (!normalizedName) {
    throw new Error('EMPTY_FOLDER_NAME');
  }
  if (isSystemFolderName(normalizedName)) {
    throw new Error('SYSTEM_FOLDER_NAME');
  }

  await prisma.libraryFolder.create({
    data: {
      userId,
      name: normalizedName,
      sortOrder: await prisma.libraryFolder.count({ where: { userId } }),
    },
  });

  return listLibraryFolders(userId);
};

export const deleteLibraryFolder = async (userId: string, folderId: number): Promise<LibraryFolderItem[]> => {
  await ensureDatabaseSchema();
  const defaultFolder = await ensureDefaultLibraryFolder(userId);

  if (folderId === defaultFolder.id || folderId === LIKED_LIBRARY_FOLDER_ID) {
    throw new Error('DEFAULT_FOLDER');
  }

  const folder = await prisma.libraryFolder.findFirst({
    where: { id: folderId, userId },
    select: { id: true },
  });
  if (!folder) {
    throw new Error('FOLDER_NOT_FOUND');
  }

  await prisma.savedWork.updateMany({
    where: { userId, folderId },
    data: { folderId: defaultFolder.id },
  });
  await prisma.libraryFolder.delete({ where: { id: folderId } });

  const folders = await prisma.libraryFolder.findMany({
    where: { userId },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    select: { id: true },
  });
  await Promise.all(folders.map((folderItem, index) => (
    prisma.libraryFolder.update({
      where: { id: folderItem.id },
      data: { sortOrder: index },
    })
  )));

  return listLibraryFolders(userId);
};

export const reorderLibraryFolders = async (userId: string, folderIds: number[]): Promise<LibraryFolderItem[]> => {
  await ensureDatabaseSchema();
  await ensureDefaultLibraryFolder(userId);

  const ownedFolders = await prisma.libraryFolder.findMany({
    where: { userId },
    select: { id: true },
  });
  const ownedIds = new Set(ownedFolders.map((folder) => folder.id));
  const uniqueIds = Array.from(new Set(folderIds)).filter((id) => ownedIds.has(id));
  const missingIds = ownedFolders.map((folder) => folder.id).filter((id) => !uniqueIds.includes(id));
  const orderedIds = [...uniqueIds, ...missingIds];

  await Promise.all(orderedIds.map((id, index) => (
    prisma.libraryFolder.update({
      where: { id },
      data: { sortOrder: index },
    })
  )));

  return listLibraryFolders(userId);
};

export const listSavedWorks = async (userId: string, folderId?: number | null): Promise<SavedWorkItem[]> => {
  await ensureDatabaseSchema();
  await ensureDefaultLibraryFolder(userId);

  if (folderId === LIKED_LIBRARY_FOLDER_ID) {
    const items = await prisma.workLike.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        workId: true,
        createdAt: true,
        work: {
          select: {
            title: true,
            category: true,
            imageUrl: true,
            imageWidth: true,
            imageHeight: true,
            thumbnailUrl: true,
            thumbnailWidth: true,
            thumbnailHeight: true,
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

    return items.map((item) => mapSavedWork({
      workId: item.workId,
      folderId: LIKED_LIBRARY_FOLDER_ID,
      savedAt: item.createdAt,
      work: item.work,
    }));
  }

  const items = await prisma.savedWork.findMany({
    where: {
      userId,
      ...(folderId ? { folderId } : {}),
    },
    orderBy: { savedAt: 'desc' },
    select: {
      workId: true,
      folderId: true,
      savedAt: true,
      work: {
        select: {
          title: true,
          category: true,
          imageUrl: true,
          imageWidth: true,
          imageHeight: true,
          thumbnailUrl: true,
          thumbnailWidth: true,
          thumbnailHeight: true,
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

export const saveWork = async (userId: string, id: number, folderId?: number): Promise<SavedWorkItem[]> => {
  await ensureDatabaseSchema();
  const defaultFolder = await ensureDefaultLibraryFolder(userId);
  const targetFolderId = folderId ?? defaultFolder.id;

  const targetFolder = await prisma.libraryFolder.findFirst({
    where: {
      id: targetFolderId,
      userId,
    },
    select: { id: true },
  });

  await prisma.savedWork.upsert({
    where: {
      userId_workId: {
        userId,
        workId: id,
      },
    },
    update: {
      folderId: targetFolder?.id ?? defaultFolder.id,
    },
    create: {
      userId,
      workId: id,
      folderId: targetFolder?.id ?? defaultFolder.id,
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

export const moveSavedWork = async (userId: string, id: number, folderId: number): Promise<SavedWorkItem[]> => {
  await ensureDatabaseSchema();
  await ensureDefaultLibraryFolder(userId);

  const folder = await prisma.libraryFolder.findFirst({
    where: {
      id: folderId,
      userId,
    },
    select: { id: true },
  });

  if (!folder) {
    throw new Error('FOLDER_NOT_FOUND');
  }

  await prisma.savedWork.updateMany({
    where: {
      userId,
      workId: id,
    },
    data: {
      folderId: folder.id,
    },
  });

  return listSavedWorks(userId, folder.id);
};

