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
  professionalSkills: [],
  professionalSoftware: [],
  publicEmail: '',
  showPublicEmail: true,
  hiringTypes: [],
  socialLinks: {},
  publishReady: false,
  notifyLikes: true,
  notifyComments: true,
  emailNotifications: false,
});

const parseStringList = (value: string | null | undefined) => {
  try {
    const parsed = JSON.parse(value ?? '[]') as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
};

const stringifyStringList = (value: string[] | undefined) => JSON.stringify(Array.isArray(value) ? value : []);

const parseSocialLinks = (value: string | null | undefined): UserProfile['socialLinks'] => {
  try {
    const parsed = JSON.parse(value ?? '{}') as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim().length > 0),
    );
  } catch {
    return {};
  }
};

const stringifySocialLinks = (value: UserProfile['socialLinks'] | undefined) => JSON.stringify(value && typeof value === 'object' ? value : {});

const toPrismaProfileData = (profile: UserProfile) => ({
  ...profile,
  professionalSkills: stringifyStringList(profile.professionalSkills),
  professionalSoftware: stringifyStringList(profile.professionalSoftware),
  hiringTypes: stringifyStringList(profile.hiringTypes),
  socialLinks: stringifySocialLinks(profile.socialLinks),
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
    professionalSkills: string;
    professionalSoftware: string;
    publicEmail: string;
    showPublicEmail: boolean;
    hiringTypes: string;
    socialLinks: string;
    publishReady: boolean;
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
        professionalSkills: parseStringList(user.profile.professionalSkills),
        professionalSoftware: parseStringList(user.profile.professionalSoftware),
        publicEmail: user.profile.publicEmail,
        showPublicEmail: user.profile.showPublicEmail,
        hiringTypes: parseStringList(user.profile.hiringTypes),
        socialLinks: parseSocialLinks(user.profile.socialLinks),
        publishReady: user.profile.publishReady,
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
        create: toPrismaProfileData(createDefaultProfile(params.username)),
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
        professionalSkills: parseStringList(existing.profile.professionalSkills),
        professionalSoftware: parseStringList(existing.profile.professionalSoftware),
        publicEmail: existing.profile.publicEmail,
        showPublicEmail: existing.profile.showPublicEmail,
        hiringTypes: parseStringList(existing.profile.hiringTypes),
        socialLinks: parseSocialLinks(existing.profile.socialLinks),
        publishReady: existing.profile.publishReady,
        notifyLikes: existing.profile.notifyLikes,
        notifyComments: existing.profile.notifyComments,
        emailNotifications: existing.profile.emailNotifications,
      }
    : createDefaultProfile(existing.username);

  const nextProfile = {
    ...baseProfile,
    ...patch,
  };

  const profileData = toPrismaProfileData(nextProfile);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      profile: existing.profile
        ? {
            update: profileData,
          }
        : {
            create: profileData,
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
