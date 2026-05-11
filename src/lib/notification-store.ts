import { ensureDatabaseSchema } from '@/lib/db-bootstrap';
import { isMailConfigured, sendActivityNotificationEmail } from '@/lib/mail';
import { prisma } from '@/lib/prisma';

export type NotificationType = 'like' | 'comment' | 'system';

export type NotificationItem = {
  id: number;
  text: string;
  type: string;
  href: string | null;
  unread: boolean;
  createdAt: string;
};

export type NotificationSettings = {
  notifyLikes: boolean;
  notifyComments: boolean;
  emailNotifications: boolean;
};

const mapNotification = (item: {
  id: number;
  text: string;
  type: string;
  href: string | null;
  unread: boolean;
  createdAt: Date;
}): NotificationItem => ({
  id: item.id,
  text: item.text,
  type: item.type,
  href: item.href,
  unread: item.unread,
  createdAt: new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(item.createdAt),
});

export const listNotifications = async (userId: string): Promise<NotificationItem[]> => {
  await ensureDatabaseSchema();
  const existing = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: { id: true, text: true, type: true, href: true, unread: true, createdAt: true },
  });

  return existing.map(mapNotification);
};

export const markAllNotificationsAsRead = async (userId: string): Promise<NotificationItem[]> => {
  await ensureDatabaseSchema();
  await prisma.notification.updateMany({
    where: { userId, unread: true },
    data: { unread: false },
  });

  return listNotifications(userId);
};

export const getNotificationSettings = async (userId: string): Promise<NotificationSettings | null> => {
  await ensureDatabaseSchema();
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: {
      notifyLikes: true,
      notifyComments: true,
      emailNotifications: true,
    },
  });

  return profile;
};

export const updateNotificationSettings = async (
  userId: string,
  settings: NotificationSettings
): Promise<NotificationSettings> => {
  await ensureDatabaseSchema();
  const profile = await prisma.profile.upsert({
    where: { userId },
    create: {
      userId,
      nickname: 'ArtSide user',
      location: 'Не указано',
      bio: 'Расскажите о себе в профиле.',
      avatarUrl: '',
      notifyLikes: settings.notifyLikes,
      notifyComments: settings.notifyComments,
      emailNotifications: settings.emailNotifications,
    },
    update: settings,
    select: {
      notifyLikes: true,
      notifyComments: true,
      emailNotifications: true,
    },
  });

  return profile;
};

export const createActivityNotification = async (params: {
  recipientId: string;
  actorId: string;
  actorName: string;
  type: Exclude<NotificationType, 'system'>;
  workId: number;
  workTitle: string;
}) => {
  await ensureDatabaseSchema();

  if (params.recipientId === params.actorId) {
    return null;
  }

  const recipient = await prisma.user.findUnique({
    where: { id: params.recipientId },
    select: {
      email: true,
      profile: {
        select: {
          notifyLikes: true,
          notifyComments: true,
          emailNotifications: true,
        },
      },
    },
  });

  if (!recipient?.profile) {
    return null;
  }

  const enabled = params.type === 'like' ? recipient.profile.notifyLikes : recipient.profile.notifyComments;
  if (!enabled) {
    return null;
  }

  const text = params.type === 'like'
    ? `${params.actorName} оценил вашу работу "${params.workTitle}".`
    : `${params.actorName} оставил комментарий к работе "${params.workTitle}".`;
  const href = `/work/${params.workId}`;

  const notification = await prisma.notification.create({
    data: {
      userId: params.recipientId,
      actorId: params.actorId,
      workId: params.workId,
      type: params.type,
      href,
      text,
      unread: true,
    },
  });

  if (recipient.profile.emailNotifications && isMailConfigured()) {
    await sendActivityNotificationEmail({
      to: recipient.email,
      title: params.type === 'like' ? 'Новая оценка работы' : 'Новый комментарий',
      text,
      href,
    });
  }

  return mapNotification(notification);
};
