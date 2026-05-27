import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const seedWorks = [
  {
    title: 'Editorial Identity System',
    category: 'Графический дизайн',
    description: 'Система визуальной идентичности для независимого медиа: сетка, постеры, обложки и цифровые носители.',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    imageWidth: 1200,
    imageHeight: 1200,
    tags: ['identity', 'poster', 'editorial'],
    featured: true,
  },
  {
    title: 'Atrium Light Study',
    category: 'Архитектура',
    description: 'Исследование света и материалов в общественном интерьере с мягкой навигацией и открытыми уровнями.',
    imageUrl: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
    imageWidth: 1200,
    imageHeight: 800,
    tags: ['architecture', 'interior', 'light'],
    featured: true,
  },
  {
    title: 'Product Launch Screens',
    category: 'UI/UX',
    description: 'Набор экранов для запуска продукта: карточки функций, onboarding, pricing и мобильная адаптация.',
    imageUrl: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&w=1200&q=80',
    imageWidth: 1200,
    imageHeight: 900,
    tags: ['ui', 'product', 'mobile'],
    featured: true,
  },
  {
    title: 'Studio Portrait Series',
    category: 'Фотография',
    description: 'Портретная серия с акцентом на естественную пластику, мягкий контраст и чистый фон.',
    imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=80',
    imageWidth: 1000,
    imageHeight: 1500,
    tags: ['portrait', 'photo', 'studio'],
  },
  {
    title: 'Control Panel UI',
    category: 'UI/UX',
    description: 'Плотный интерфейс панели управления с таблицами, быстрыми фильтрами и статусами.',
    imageUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=80',
    imageWidth: 1200,
    imageHeight: 780,
    tags: ['dashboard', 'control', 'saas'],
  },
];

const seedViewerIds = Array.from({ length: 8 }, (_, index) => `seed-demo-viewer-${index + 1}`);

async function main() {
  const author = await prisma.user.upsert({
    where: { username: 'artside_curator' },
    update: {},
    create: {
      id: 'seed-artside-curator',
      username: 'artside_curator',
      email: 'curator@artside.local',
      passwordHash: '$2a$10$uXcfb3w58JrTuA4y9.PJdOD1p6NHHgG2hrVbp7X8Be4OZ26LvfFM.',
      profile: {
        create: {
          nickname: 'ArtSide Curator',
          location: 'Москва',
          bio: 'Редакционный аккаунт с первыми работами для ленты.',
          avatarUrl: '',
        },
      },
    },
  });

  const seededWorkIds = [];
  for (const work of seedWorks) {
    const data = {
      category: work.category,
      description: work.description,
      status: 'published',
      imageUrl: work.imageUrl,
      imageKey: null,
      imageWidth: work.imageWidth,
      imageHeight: work.imageHeight,
      thumbnailUrl: work.imageUrl,
      thumbnailKey: null,
      thumbnailWidth: work.imageWidth,
      thumbnailHeight: work.imageHeight,
      tags: JSON.stringify(work.tags),
      featured: Boolean(work.featured),
    };

    const existing = await prisma.work.findFirst({
      where: { authorId: author.id, title: work.title },
      select: { id: true },
    });

    const saved = existing
      ? await prisma.work.update({ where: { id: existing.id }, data })
      : await prisma.work.create({
          data: {
            authorId: author.id,
            title: work.title,
            ...data,
            images: {
              create: {
                url: work.imageUrl,
                key: null,
                width: work.imageWidth,
                height: work.imageHeight,
                sortOrder: 0,
              },
            },
          },
        });

    const imageCount = await prisma.workImage.count({ where: { workId: saved.id } });
    if (imageCount === 0) {
      await prisma.workImage.create({
        data: {
          workId: saved.id,
          url: work.imageUrl,
          key: null,
          width: work.imageWidth,
          height: work.imageHeight,
          sortOrder: 0,
        },
      });
    }

    seededWorkIds.push(saved.id);
  }

  for (const [index, userId] of seedViewerIds.entries()) {
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        username: `demo_viewer_${index + 1}`,
        email: `demo.viewer.${index + 1}@artside.local`,
        passwordHash: '$2a$10$uXcfb3w58JrTuA4y9.PJdOD1p6NHHgG2hrVbp7X8Be4OZ26LvfFM.',
        profile: {
          create: {
            nickname: `Demo Viewer ${index + 1}`,
            location: 'ArtSide',
            bio: 'Служебный демо-аккаунт для тестовой активности.',
            avatarUrl: '',
          },
        },
      },
    });
  }

  for (const [workIndex, workId] of seededWorkIds.entries()) {
    const activeViewers = seedViewerIds.slice(0, Math.max(1, seedViewerIds.length - workIndex));
    for (const [viewerIndex, userId] of activeViewers.entries()) {
      await prisma.workView.create({
        data: {
          userId,
          workId,
          viewerKey: 'seed-demo',
          viewedAt: new Date(Date.now() - (workIndex * 12 + viewerIndex) * 60 * 1000),
        },
      }).catch(() => undefined);

      if (viewerIndex % 2 === 0) {
        await prisma.workLike.upsert({
          where: { userId_workId: { userId, workId } },
          update: {},
          create: { userId, workId },
        });
      }
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Demo seed completed.');
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
