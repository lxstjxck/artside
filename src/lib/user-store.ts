import { randomUUID } from 'node:crypto';
import type { AuthUser, StoredUser, UserProfile } from '@/lib/auth-types';
import { ensureDatabaseSchema } from '@/lib/db-bootstrap';
import { prisma } from '@/lib/prisma';

const createDefaultProfile = (username: string): UserProfile => ({
  nickname: username,
  location: 'Не указано',
  bio: 'Расскажите о себе в профиле.',
  avatarUrl: '',
  avatarKey: null,
  notifyLikes: true,
  notifyComments: true,
  emailNotifications: false,
});

const mapPrismaUserToStored = (user: {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  profile: {
    nickname: string;
    location: string;
    bio: string;
    avatarUrl: string;
    avatarKey: string | null;
    notifyLikes: boolean;
    notifyComments: boolean;
    emailNotifications: boolean;
  } | null;
}): StoredUser => ({
  id: user.id,
  username: user.username,
  email: user.email,
  passwordHash: user.passwordHash,
  profile: user.profile
    ? {
        nickname: user.profile.nickname,
        location: user.profile.location,
        bio: user.profile.bio,
        avatarUrl: user.profile.avatarUrl,
        avatarKey: user.profile.avatarKey,
        notifyLikes: user.profile.notifyLikes,
        notifyComments: user.profile.notifyComments,
        emailNotifications: user.profile.emailNotifications,
      }
    : createDefaultProfile(user.username),
});

const toPublicUser = (user: StoredUser): AuthUser => ({
  id: user.id,
  username: user.username,
  email: user.email,
});

export const findUserByEmail = async (email: string): Promise<StoredUser | null> => {
  await ensureDatabaseSchema();
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { profile: true },
  });

  return user ? mapPrismaUserToStored(user) : null;
};

export const findUserById = async (id: string): Promise<StoredUser | null> => {
  await ensureDatabaseSchema();
  const user = await prisma.user.findUnique({
    where: { id },
    include: { profile: true },
  });

  return user ? mapPrismaUserToStored(user) : null;
};

export const findUserByUsername = async (username: string): Promise<StoredUser | null> => {
  await ensureDatabaseSchema();
  const user = await prisma.user.findFirst({
    where: { username },
    include: { profile: true },
  });

  return user ? mapPrismaUserToStored(user) : null;
};

export const createUser = async (params: {
  username: string;
  email: string;
  passwordHash: string;
}): Promise<AuthUser> => {
  await ensureDatabaseSchema();
  const email = params.email.toLowerCase();

  const [emailInUse, usernameInUse] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { username: params.username }, select: { id: true } }),
  ]);

  if (emailInUse) {
    throw new Error('EMAIL_IN_USE');
  }
  if (usernameInUse) {
    throw new Error('USERNAME_IN_USE');
  }

  const created = await prisma.user.create({
    data: {
      id: randomUUID(),
      username: params.username,
      email,
      passwordHash: params.passwordHash,
      profile: {
        create: createDefaultProfile(params.username),
      },
    },
    include: { profile: true },
  });

  return toPublicUser(mapPrismaUserToStored(created));
};

export const updateUserProfile = async (userId: string, patch: Partial<UserProfile>): Promise<StoredUser | null> => {
  await ensureDatabaseSchema();
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!existing) {
    return null;
  }

  const baseProfile = existing.profile
    ? {
        nickname: existing.profile.nickname,
        location: existing.profile.location,
        bio: existing.profile.bio,
        avatarUrl: existing.profile.avatarUrl,
        avatarKey: existing.profile.avatarKey,
        notifyLikes: existing.profile.notifyLikes,
        notifyComments: existing.profile.notifyComments,
        emailNotifications: existing.profile.emailNotifications,
      }
    : createDefaultProfile(existing.username);

  const nextProfile = {
    ...baseProfile,
    ...patch,
  };

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      profile: existing.profile
        ? {
            update: nextProfile,
          }
        : {
            create: nextProfile,
          },
    },
    include: { profile: true },
  });

  return mapPrismaUserToStored(updated);
};

export const updateUserPassword = async (userId: string, passwordHash: string): Promise<void> => {
  await ensureDatabaseSchema();
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
};

export const updateUserEmail = async (userId: string, email: string): Promise<StoredUser> => {
  await ensureDatabaseSchema();
  const normalizedEmail = email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });

  if (existing && existing.id !== userId) {
    throw new Error('EMAIL_IN_USE');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { email: normalizedEmail },
    include: { profile: true },
  });

  return mapPrismaUserToStored(updated);
};

export const mapStoredUserToPublic = toPublicUser;
