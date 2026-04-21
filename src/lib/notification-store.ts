import { ensureDatabaseSchema } from '@/lib/db-bootstrap';
import { prisma } from '@/lib/prisma';

export type NotificationItem = {
  id: number;
  text: string;
  unread: boolean;
};

const defaultNotifications = [
  'Новый комментарий к вашей работе',
  'Пользователь added_you в подписках',
  'Подборка недели уже доступна',
];

const mapNotification = (item: { id: number; text: string; unread: boolean }): NotificationItem => ({
  id: item.id,
  text: item.text,
  unread: item.unread,
});

export const listNotifications = async (userId: string): Promise<NotificationItem[]> => {
  await ensureDatabaseSchema();
  const existing = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, text: true, unread: true },
  });

  if (existing.length > 0) {
    return existing.map(mapNotification);
  }

  await prisma.notification.createMany({
    data: defaultNotifications.map((text) => ({ userId, text, unread: true })),
  });

  const seeded = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, text: true, unread: true },
  });

  return seeded.map(mapNotification);
};

export const markAllNotificationsAsRead = async (userId: string): Promise<NotificationItem[]> => {
  await ensureDatabaseSchema();
  await prisma.notification.updateMany({
    where: { userId, unread: true },
    data: { unread: false },
  });

  return listNotifications(userId);
};
