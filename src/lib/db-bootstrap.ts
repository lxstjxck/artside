import { prisma } from '@/lib/prisma';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { UserProfile } from '@/lib/auth-types';

let bootstrapPromise: Promise<void> | null = null;

export const ensureDatabaseSchema = async () => {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;');

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "username" TEXT NOT NULL,
          "email" TEXT NOT NULL,
          "passwordHash" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Profile" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "userId" TEXT NOT NULL,
          "nickname" TEXT NOT NULL,
          "location" TEXT NOT NULL,
          "bio" TEXT NOT NULL,
          "avatarUrl" TEXT NOT NULL,
          "avatarKey" TEXT,
          "professionalSkills" TEXT NOT NULL DEFAULT '[]',
          "professionalSoftware" TEXT NOT NULL DEFAULT '[]',
          "publicEmail" TEXT NOT NULL DEFAULT '',
          "showPublicEmail" BOOLEAN NOT NULL DEFAULT true,
          "hiringTypes" TEXT NOT NULL DEFAULT '[]',
          "socialLinks" TEXT NOT NULL DEFAULT '{}',
          "publishReady" BOOLEAN NOT NULL DEFAULT false,
          "notifyLikes" BOOLEAN NOT NULL DEFAULT true,
          "notifyComments" BOOLEAN NOT NULL DEFAULT true,
          "emailNotifications" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Work" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "authorId" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "category" TEXT NOT NULL,
          "description" TEXT NOT NULL DEFAULT '',
          "status" TEXT NOT NULL DEFAULT 'published',
          "imageUrl" TEXT NOT NULL DEFAULT '',
          "imageKey" TEXT,
          "imageWidth" INTEGER NOT NULL DEFAULT 1200,
          "imageHeight" INTEGER NOT NULL DEFAULT 1500,
          "thumbnailUrl" TEXT,
          "thumbnailKey" TEXT,
          "thumbnailWidth" INTEGER,
          "thumbnailHeight" INTEGER,
          "tags" TEXT NOT NULL DEFAULT '[]',
          "featured" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "WorkImage" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "workId" INTEGER NOT NULL,
          "url" TEXT NOT NULL,
          "key" TEXT,
          "width" INTEGER NOT NULL,
          "height" INTEGER NOT NULL,
          "sortOrder" INTEGER NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "SavedWork" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "userId" TEXT NOT NULL,
          "workId" INTEGER NOT NULL,
          "folderId" INTEGER,
          "savedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY ("folderId") REFERENCES "LibraryFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "LibraryFolder" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "userId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "sortOrder" INTEGER NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Notification" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "userId" TEXT NOT NULL,
          "text" TEXT NOT NULL,
          "type" TEXT NOT NULL DEFAULT 'system',
          "href" TEXT,
          "actorId" TEXT,
          "workId" INTEGER,
          "unread" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "WorkLike" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "userId" TEXT NOT NULL,
          "workId" INTEGER NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "WorkComment" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "userId" TEXT NOT NULL,
          "workId" INTEGER NOT NULL,
          "text" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "WorkView" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "userId" TEXT,
          "workId" INTEGER NOT NULL,
          "viewerKey" TEXT,
          "viewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
          FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "userId" TEXT NOT NULL,
          "tokenHash" TEXT NOT NULL,
          "expiresAt" DATETIME NOT NULL,
          "usedAt" DATETIME,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);

      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");');
      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");');
      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Profile_userId_key" ON "Profile"("userId");');
      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "SavedWork_userId_workId_key" ON "SavedWork"("userId", "workId");');
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "SavedWork_folderId_idx" ON "SavedWork"("folderId");');
      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "LibraryFolder_userId_name_key" ON "LibraryFolder"("userId", "name");');
      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "WorkLike_userId_workId_key" ON "WorkLike"("userId", "workId");');
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "WorkView_workId_viewedAt_idx" ON "WorkView"("workId", "viewedAt");');
      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");');
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");');
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Work_status_createdAt_idx" ON "Work"("status", "createdAt");');
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "WorkImage_workId_sortOrder_idx" ON "WorkImage"("workId", "sortOrder");');

      const workColumns = await prisma.$queryRawUnsafe<Array<{ name: string }>>('PRAGMA table_info("Work");');
      const workColumnNames = new Set(workColumns.map((column) => column.name));
      if (!workColumnNames.has('status')) {
        await prisma.$executeRawUnsafe('ALTER TABLE "Work" ADD COLUMN "status" TEXT NOT NULL DEFAULT \'published\';');
      }
      if (!workColumnNames.has('thumbnailUrl')) {
        await prisma.$executeRawUnsafe('ALTER TABLE "Work" ADD COLUMN "thumbnailUrl" TEXT;');
      }
      if (!workColumnNames.has('thumbnailKey')) {
        await prisma.$executeRawUnsafe('ALTER TABLE "Work" ADD COLUMN "thumbnailKey" TEXT;');
      }
      if (!workColumnNames.has('thumbnailWidth')) {
        await prisma.$executeRawUnsafe('ALTER TABLE "Work" ADD COLUMN "thumbnailWidth" INTEGER;');
      }
      if (!workColumnNames.has('thumbnailHeight')) {
        await prisma.$executeRawUnsafe('ALTER TABLE "Work" ADD COLUMN "thumbnailHeight" INTEGER;');
      }

      const profileColumns = await prisma.$queryRawUnsafe<Array<{ name: string }>>('PRAGMA table_info("Profile");');
      const profileColumnNames = new Set(profileColumns.map((column) => column.name));
      if (!profileColumnNames.has('notifyLikes')) {
        await prisma.$executeRawUnsafe('ALTER TABLE "Profile" ADD COLUMN "notifyLikes" BOOLEAN NOT NULL DEFAULT true;');
      }
      if (!profileColumnNames.has('notifyComments')) {
        await prisma.$executeRawUnsafe('ALTER TABLE "Profile" ADD COLUMN "notifyComments" BOOLEAN NOT NULL DEFAULT true;');
      }
      if (!profileColumnNames.has('emailNotifications')) {
        await prisma.$executeRawUnsafe('ALTER TABLE "Profile" ADD COLUMN "emailNotifications" BOOLEAN NOT NULL DEFAULT false;');
      }
      if (!profileColumnNames.has('professionalSkills')) {
        await prisma.$executeRawUnsafe('ALTER TABLE "Profile" ADD COLUMN "professionalSkills" TEXT NOT NULL DEFAULT \'[]\';');
      }
      if (!profileColumnNames.has('professionalSoftware')) {
        await prisma.$executeRawUnsafe('ALTER TABLE "Profile" ADD COLUMN "professionalSoftware" TEXT NOT NULL DEFAULT \'[]\';');
      }
      if (!profileColumnNames.has('publicEmail')) {
        await prisma.$executeRawUnsafe('ALTER TABLE "Profile" ADD COLUMN "publicEmail" TEXT NOT NULL DEFAULT \'\';');
      }
      if (!profileColumnNames.has('showPublicEmail')) {
        await prisma.$executeRawUnsafe('ALTER TABLE "Profile" ADD COLUMN "showPublicEmail" BOOLEAN NOT NULL DEFAULT true;');
      }
      if (!profileColumnNames.has('hiringTypes')) {
        await prisma.$executeRawUnsafe('ALTER TABLE "Profile" ADD COLUMN "hiringTypes" TEXT NOT NULL DEFAULT \'[]\';');
      }
      if (!profileColumnNames.has('socialLinks')) {
        await prisma.$executeRawUnsafe('ALTER TABLE "Profile" ADD COLUMN "socialLinks" TEXT NOT NULL DEFAULT \'{}\';');
      }
      if (!profileColumnNames.has('publishReady')) {
        await prisma.$executeRawUnsafe('ALTER TABLE "Profile" ADD COLUMN "publishReady" BOOLEAN NOT NULL DEFAULT false;');
      }

      const savedWorkColumns = await prisma.$queryRawUnsafe<Array<{ name: string }>>('PRAGMA table_info("SavedWork");');
      const savedWorkColumnNames = new Set(savedWorkColumns.map((column) => column.name));
      if (!savedWorkColumnNames.has('folderId')) {
        await prisma.$executeRawUnsafe('ALTER TABLE "SavedWork" ADD COLUMN "folderId" INTEGER;');
      }

      const libraryFolderColumns = await prisma.$queryRawUnsafe<Array<{ name: string }>>('PRAGMA table_info("LibraryFolder");');
      const libraryFolderColumnNames = new Set(libraryFolderColumns.map((column) => column.name));
      if (!libraryFolderColumnNames.has('sortOrder')) {
        await prisma.$executeRawUnsafe('ALTER TABLE "LibraryFolder" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;');
      }

      const notificationColumns = await prisma.$queryRawUnsafe<Array<{ name: string }>>('PRAGMA table_info("Notification");');
      const notificationColumnNames = new Set(notificationColumns.map((column) => column.name));
      if (!notificationColumnNames.has('type')) {
        await prisma.$executeRawUnsafe('ALTER TABLE "Notification" ADD COLUMN "type" TEXT NOT NULL DEFAULT \'system\';');
      }
      if (!notificationColumnNames.has('href')) {
        await prisma.$executeRawUnsafe('ALTER TABLE "Notification" ADD COLUMN "href" TEXT;');
      }
      if (!notificationColumnNames.has('actorId')) {
        await prisma.$executeRawUnsafe('ALTER TABLE "Notification" ADD COLUMN "actorId" TEXT;');
      }
      if (!notificationColumnNames.has('workId')) {
        await prisma.$executeRawUnsafe('ALTER TABLE "Notification" ADD COLUMN "workId" INTEGER;');
      }

      const usersCount = await prisma.user.count();
      if (usersCount > 0) {
        return;
      }

      const dataDir = path.join(process.cwd(), 'data');
      const usersPath = path.join(dataDir, 'users.json');
      const worksPath = path.join(dataDir, 'works.json');
      const savedWorksPath = path.join(dataDir, 'saved-works.json');

      type LegacyUser = {
        id: string;
        username: string;
        email: string;
        passwordHash: string;
        profile?: Partial<UserProfile>;
      };
      type LegacyUsersFile = { users?: LegacyUser[] };
      type LegacyWork = {
        id: number;
        title: string;
        category: string;
        description?: string;
        imageUrl?: string;
        imageKey?: string;
        imageWidth?: number;
        imageHeight?: number;
        tags?: string[];
        featured?: boolean;
      };
      type LegacyWorksFile = { users?: Record<string, LegacyWork[]> };
      type LegacySavedWorksFile = {
        users?: Record<string, Array<{ id: number; savedAt: string }>>;
      };

      const safeReadJson = async <T,>(filePath: string, fallback: T): Promise<T> => {
        try {
          const raw = await fs.readFile(filePath, 'utf8');
          return JSON.parse(raw) as T;
        } catch {
          return fallback;
        }
      };

      const legacyUsers = await safeReadJson<LegacyUsersFile>(usersPath, {});
      const legacyWorks = await safeReadJson<LegacyWorksFile>(worksPath, {});
      const legacySavedWorks = await safeReadJson<LegacySavedWorksFile>(savedWorksPath, {});

      const users = Array.isArray(legacyUsers.users) ? legacyUsers.users : [];
      for (const user of users) {
        const profile: UserProfile = {
          nickname: user.profile?.nickname ?? user.username,
          location: user.profile?.location ?? 'Не указано',
          bio: user.profile?.bio ?? 'Расскажите о себе в профиле.',
          avatarUrl: user.profile?.avatarUrl ?? '',
          avatarKey: user.profile?.avatarKey ?? null,
          professionalSkills: user.profile?.professionalSkills ?? [],
          professionalSoftware: user.profile?.professionalSoftware ?? [],
          publicEmail: user.profile?.publicEmail ?? '',
          showPublicEmail: user.profile?.showPublicEmail ?? true,
          hiringTypes: user.profile?.hiringTypes ?? [],
          socialLinks: user.profile?.socialLinks ?? {},
          publishReady: user.profile?.publishReady ?? false,
          notifyLikes: user.profile?.notifyLikes ?? true,
          notifyComments: user.profile?.notifyComments ?? true,
          emailNotifications: user.profile?.emailNotifications ?? false,
        };

        await prisma.user.create({
          data: {
            id: user.id,
            username: user.username,
            email: user.email.toLowerCase(),
            passwordHash: user.passwordHash,
            profile: {
              create: {
                ...profile,
                professionalSkills: JSON.stringify(profile.professionalSkills),
                professionalSoftware: JSON.stringify(profile.professionalSoftware),
                hiringTypes: JSON.stringify(profile.hiringTypes),
                socialLinks: JSON.stringify(profile.socialLinks),
              },
            },
          },
        });
      }

      for (const [userId, works] of Object.entries(legacyWorks.users ?? {})) {
        if (!Array.isArray(works)) continue;

        for (const work of works) {
          if (!Number.isInteger(work.id)) continue;

          await prisma.work.upsert({
            where: {
              id: work.id,
            },
            update: {
              title: work.title,
              category: work.category,
              description: work.description ?? '',
              imageUrl: work.imageUrl ?? '',
              imageKey: work.imageKey ?? null,
              imageWidth: work.imageWidth ?? 1200,
              imageHeight: work.imageHeight ?? 1500,
              tags: JSON.stringify(work.tags ?? []),
              featured: Boolean(work.featured),
            },
            create: {
              id: work.id,
              authorId: userId,
              title: work.title,
              category: work.category,
              description: work.description ?? '',
              imageUrl: work.imageUrl ?? '',
              imageKey: work.imageKey ?? null,
              imageWidth: work.imageWidth ?? 1200,
              imageHeight: work.imageHeight ?? 1500,
              tags: JSON.stringify(work.tags ?? []),
              featured: Boolean(work.featured),
            },
          });
        }
      }

      for (const [userId, savedItems] of Object.entries(legacySavedWorks.users ?? {})) {
        if (!Array.isArray(savedItems)) continue;

        for (const item of savedItems) {
          if (!Number.isInteger(item.id)) {
            continue;
          }

          await prisma.savedWork.upsert({
            where: {
              userId_workId: {
                userId,
                workId: item.id,
              },
            },
            update: {
              savedAt: new Date(item.savedAt),
            },
            create: {
              userId,
              workId: item.id,
              savedAt: new Date(item.savedAt),
            },
          });
        }
      }
    })();
  }

  await bootstrapPromise;
};
