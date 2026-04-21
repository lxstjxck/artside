import { prisma } from '@/lib/prisma';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { SavedWorkKind } from '@/lib/saved-work-types';
import type { UserProfile } from '@/lib/auth-types';

let bootstrapPromise: Promise<void> | null = null;

export const ensureDatabaseSchema = async () => {
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
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Work" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "userId" TEXT NOT NULL,
          "externalId" INTEGER NOT NULL,
          "title" TEXT NOT NULL,
          "category" TEXT NOT NULL,
          "featured" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "SavedWork" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "userId" TEXT NOT NULL,
          "kind" TEXT NOT NULL,
          "targetId" INTEGER NOT NULL,
          "savedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Notification" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "userId" TEXT NOT NULL,
          "text" TEXT NOT NULL,
          "unread" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);

      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");');
      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");');
      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Profile_userId_key" ON "Profile"("userId");');
      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Work_userId_externalId_key" ON "Work"("userId", "externalId");');
      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "SavedWork_userId_kind_targetId_key" ON "SavedWork"("userId", "kind", "targetId");');

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
        featured?: boolean;
      };
      type LegacyWorksFile = { users?: Record<string, LegacyWork[]> };
      type LegacySavedWorksFile = {
        users?: Record<string, Array<{ kind: SavedWorkKind; id: number; savedAt: string }>>;
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
        };

        await prisma.user.create({
          data: {
            id: user.id,
            username: user.username,
            email: user.email.toLowerCase(),
            passwordHash: user.passwordHash,
            profile: {
              create: profile,
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
              userId_externalId: {
                userId,
                externalId: work.id,
              },
            },
            update: {
              title: work.title,
              category: work.category,
              featured: Boolean(work.featured),
            },
            create: {
              userId,
              externalId: work.id,
              title: work.title,
              category: work.category,
              featured: Boolean(work.featured),
            },
          });
        }
      }

      for (const [userId, savedItems] of Object.entries(legacySavedWorks.users ?? {})) {
        if (!Array.isArray(savedItems)) continue;

        for (const item of savedItems) {
          if (!(item.kind === 'popular' || item.kind === 'recommendation') || !Number.isInteger(item.id)) {
            continue;
          }

          await prisma.savedWork.upsert({
            where: {
              userId_kind_targetId: {
                userId,
                kind: item.kind,
                targetId: item.id,
              },
            },
            update: {
              savedAt: new Date(item.savedAt),
            },
            create: {
              userId,
              kind: item.kind,
              targetId: item.id,
              savedAt: new Date(item.savedAt),
            },
          });
        }
      }
    })();
  }

  await bootstrapPromise;
};
