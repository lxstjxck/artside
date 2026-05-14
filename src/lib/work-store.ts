import { ensureDatabaseSchema } from '@/lib/db-bootstrap';
import { prisma } from '@/lib/prisma';

export type WorkSummary = {
  id: number;
  title: string;
  category: string;
  author: string;
  authorUsername: string;
  imageUrl: string;
  imageKey?: string | null;
  imageWidth: number;
  imageHeight: number;
  description: string;
  tags: string[];
  views: number;
  likes: number;
  saves: number;
  commentsCount: number;
  likedByMe?: boolean;
  savedByMe?: boolean;
  featured: boolean;
  createdAt: string;
};

export type WorkComment = {
  id: number;
  author: string;
  authorUsername: string;
  text: string;
  postedAt: string;
};

export type WorkDetail = WorkSummary & {
  description: string;
  views: number;
  likes: number;
  saves: number;
  likedByMe: boolean;
  savedByMe: boolean;
  comments: WorkComment[];
  tags: string[];
  publishedAt: string;
};

export type CreateWorkInput = {
  title: string;
  category: string;
  description: string;
  imageUrl: string;
  imageKey?: string | null;
  imageWidth: number;
  imageHeight: number;
  tags: string[];
  featured?: boolean;
};

export type HomeFeedResponse = {
  categories: string[];
  popular: WorkSummary[];
  recommendations: WorkSummary[];
};

type WorkWithAuthor = {
  id: number;
  authorId: string;
  title: string;
  category: string;
  description: string;
  imageUrl: string;
  imageKey: string | null;
  imageWidth: number;
  imageHeight: number;
  tags: string;
  featured: boolean;
  createdAt: Date;
  _count: {
    views: number;
    likes: number;
    savedBy: number;
    comments: number;
  };
  likes?: Array<{ userId: string }>;
  savedBy?: Array<{ userId: string }>;
  author: {
    username: string;
    profile: {
      nickname: string;
    } | null;
  };
};

type WorkCommentWithUser = {
  id: number;
  text: string;
  createdAt: Date;
  user: {
    username: string;
    profile: {
      nickname: string;
    } | null;
  };
};

type WorkDetailRecord = WorkWithAuthor & {
  comments: WorkCommentWithUser[];
};

const seedWorks: CreateWorkInput[] = [
  {
    title: 'Editorial Identity System',
    category: 'Графический дизайн',
    description: 'Система визуальной идентичности для независимого медиа: сетка, постеры, обложки и цифровые носители.',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    imageKey: null,
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
    imageKey: null,
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
    imageKey: null,
    imageWidth: 1200,
    imageHeight: 900,
    tags: ['ui', 'product', 'mobile'],
    featured: true,
  },
  {
    title: 'Character Concept Pack',
    category: 'Game art',
    description: 'Серия концептов персонажей с вариациями силуэта, материалов и цветовых акцентов.',
    imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
    imageKey: null,
    imageWidth: 1200,
    imageHeight: 1600,
    tags: ['gameart', 'character', 'concept'],
    featured: true,
  },
  {
    title: 'Studio Portrait Series',
    category: 'Фотография',
    description: 'Портретная серия с акцентом на естественную пластику, мягкий контраст и чистый фон.',
    imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=80',
    imageKey: null,
    imageWidth: 1000,
    imageHeight: 1500,
    tags: ['portrait', 'photo', 'studio'],
  },
  {
    title: 'Motion Poster Frames',
    category: '3D art',
    description: 'Кадры для анимированного постера с объемной типографикой, стеклом и направленным светом.',
    imageUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=1200&q=80',
    imageKey: null,
    imageWidth: 1200,
    imageHeight: 1500,
    tags: ['3d', 'motion', 'typography'],
  },
  {
    title: 'Commerce Design Kit',
    category: 'Дизайн продуктов',
    description: 'Компоненты для e-commerce интерфейса: карточки товара, фильтры, checkout и состояние пустой корзины.',
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    imageKey: null,
    imageWidth: 1200,
    imageHeight: 760,
    tags: ['product', 'commerce', 'design-system'],
  },
  {
    title: 'Portfolio Website Grid',
    category: 'Дизайн сайтов',
    description: 'Сетка портфолио с крупными превью, быстрым просмотром и акцентом на авторские серии.',
    imageUrl: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?auto=format&fit=crop&w=1200&q=80',
    imageKey: null,
    imageWidth: 1200,
    imageHeight: 820,
    tags: ['web', 'portfolio', 'layout'],
  },
  {
    title: 'Fan Poster Collection',
    category: 'Fan art',
    description: 'Коллекция фанатских постеров с декоративной типографикой и плотной работой с цветом.',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=1200&q=80',
    imageKey: null,
    imageWidth: 900,
    imageHeight: 1400,
    tags: ['fanart', 'poster', 'color'],
  },
  {
    title: 'Minimal Brand Cards',
    category: 'Графический дизайн',
    description: 'Серия бренд-карточек с лаконичной типографикой, контрастными парами и печатными фактурами.',
    imageUrl: 'https://images.unsplash.com/photo-1558655146-364adaf1fcc9?auto=format&fit=crop&w=1200&q=80',
    imageWidth: 1200,
    imageHeight: 1500,
    tags: ['brand', 'print', 'cards'],
  },
  {
    title: 'Quiet Workspace',
    category: 'Фотография',
    description: 'Фотосерия рабочего пространства с мягким дневным светом и спокойной композицией.',
    imageUrl: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80',
    imageWidth: 1200,
    imageHeight: 720,
    tags: ['photo', 'workspace', 'light'],
  },
  {
    title: 'Mobile Finance Flow',
    category: 'UI/UX',
    description: 'Мобильный сценарий финансового приложения: аналитика, платежи, лимиты и быстрые действия.',
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    imageWidth: 900,
    imageHeight: 1400,
    tags: ['mobile', 'finance', 'dashboard'],
  },
  {
    title: 'Facade Rhythm',
    category: 'Архитектура',
    description: 'Визуальное исследование фасадного ритма, повторяющихся модулей и вертикального масштаба.',
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
    imageWidth: 900,
    imageHeight: 1350,
    tags: ['facade', 'urban', 'geometry'],
  },
  {
    title: 'Sci-Fi Prop Sheet',
    category: 'Game art',
    description: 'Лист игровых пропсов с вариантами материалов, форм и цветовой маркировки.',
    imageUrl: 'https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&w=1200&q=80',
    imageWidth: 1200,
    imageHeight: 950,
    tags: ['props', 'sci-fi', 'game'],
  },
  {
    title: 'Glass Object Study',
    category: '3D art',
    description: 'Тест прозрачных материалов, отражений и мягких теней на простой предметной сцене.',
    imageUrl: 'https://images.unsplash.com/photo-1604076913837-52ab5629fba9?auto=format&fit=crop&w=1200&q=80',
    imageWidth: 1000,
    imageHeight: 1250,
    tags: ['3d', 'glass', 'render'],
  },
  {
    title: 'Landing Page System',
    category: 'Дизайн сайтов',
    description: 'Комплект секций для продуктовой страницы: навигация, карточки, тарифы и блок доверия.',
    imageUrl: 'https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=1200&q=80',
    imageWidth: 1200,
    imageHeight: 900,
    tags: ['web', 'landing', 'sections'],
  },
  {
    title: 'Packaging Variants',
    category: 'Дизайн продуктов',
    description: 'Варианты упаковки с цветовой системой, маркировкой линейки и печатными деталями.',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
    imageWidth: 900,
    imageHeight: 1200,
    tags: ['packaging', 'product', 'color'],
  },
  {
    title: 'Album Fan Cover',
    category: 'Fan art',
    description: 'Фанатская обложка альбома с крупным образом, плотным цветом и декоративной сеткой.',
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80',
    imageWidth: 1200,
    imageHeight: 1200,
    tags: ['music', 'cover', 'fanart'],
  },
  {
    title: 'Editorial Photo Diptych',
    category: 'Фотография',
    description: 'Редакционный диптих с контрастом крупного плана и общей сцены.',
    imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    imageWidth: 1200,
    imageHeight: 1600,
    tags: ['editorial', 'photo', 'diptych'],
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

const parseTags = (value: string) => {
  try {
    const tags = JSON.parse(value) as unknown;
    return Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === 'string') : [];
  } catch {
    return [];
  }
};

const formatPublishedAt = (date: Date) => {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
};

const mapWorkSummary = (work: WorkWithAuthor, viewerId?: string | null): WorkSummary => ({
  id: work.id,
  title: work.title,
  category: work.category,
  author: work.author.profile?.nickname || work.author.username,
  authorUsername: work.author.username,
  imageUrl: work.imageUrl,
  imageKey: work.imageKey,
  imageWidth: work.imageWidth,
  imageHeight: work.imageHeight,
  description: work.description,
  tags: parseTags(work.tags),
  views: work._count.views,
  likes: work._count.likes,
  saves: work._count.savedBy,
  commentsCount: work._count.comments,
  likedByMe: viewerId ? Boolean(work.likes?.some((item) => item.userId === viewerId)) : false,
  savedByMe: viewerId ? Boolean(work.savedBy?.some((item) => item.userId === viewerId)) : false,
  featured: work.featured,
  createdAt: work.createdAt.toISOString(),
});

const mapComment = (comment: WorkCommentWithUser): WorkComment => ({
  id: comment.id,
  author: comment.user.profile?.nickname || comment.user.username,
  authorUsername: comment.user.username,
  text: comment.text,
  postedAt: formatPublishedAt(comment.createdAt),
});

const mapWorkDetail = (work: WorkDetailRecord, viewerId?: string | null): WorkDetail => ({
  ...mapWorkSummary(work, viewerId),
  description: work.description,
  views: work._count.views,
  likes: work._count.likes,
  saves: work._count.savedBy,
  likedByMe: viewerId ? Boolean(work.likes?.some((item) => item.userId === viewerId)) : false,
  savedByMe: viewerId ? Boolean(work.savedBy?.some((item) => item.userId === viewerId)) : false,
  comments: work.comments.map(mapComment),
  tags: parseTags(work.tags),
  publishedAt: formatPublishedAt(work.createdAt),
});

const includeForViewer = (viewerId?: string | null) => ({
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
  _count: {
    select: {
      views: true,
      likes: true,
      savedBy: true,
      comments: true,
    },
  },
  likes: viewerId ? { where: { userId: viewerId }, select: { userId: true } } : false,
  savedBy: viewerId ? { where: { userId: viewerId }, select: { userId: true } } : false,
});

const includeDetailForViewer = (viewerId?: string | null) => ({
  ...includeForViewer(viewerId),
  comments: {
    orderBy: { createdAt: 'desc' as const },
    take: 30,
    include: {
      user: {
        select: {
          username: true,
          profile: {
            select: { nickname: true },
          },
        },
      },
    },
  },
});

const getRecencyScore = (createdAt: Date) => {
  const ageHours = Math.max(1, (Date.now() - createdAt.getTime()) / 36e5);
  return 1 / Math.sqrt(ageHours);
};

const getPopularScore = (work: WorkWithAuthor) => {
  return work._count.views * 0.25
    + work._count.likes * 2
    + work._count.savedBy * 3
    + getRecencyScore(work.createdAt) * 12;
};

const seedViewerIds = Array.from({ length: 12 }, (_, index) => `seed-demo-viewer-${index + 1}`);

const ensureSeedWorks = async () => {
  const author = await prisma.user.upsert({
    where: { username: 'Название_curator' },
    update: {},
    create: {
      id: 'seed-Название-curator',
      username: 'Название_curator',
      email: 'curator@Название.local',
      passwordHash: '$2a$10$uXcfb3w58JrTuA4y9.PJdOD1p6NHHgG2hrVbp7X8Be4OZ26LvfFM.',
      profile: {
        create: {
          nickname: 'Название Curator',
          location: 'Москва',
          bio: 'Редакционный аккаунт с первыми работами для ленты.',
          avatarUrl: '',
        },
      },
    },
  });

  const seededWorkIds: number[] = [];

  for (const work of seedWorks) {
    const existing = await prisma.work.findFirst({
      where: {
        authorId: author.id,
        title: work.title,
      },
      select: { id: true },
    });

    const data = {
      category: work.category,
      description: work.description,
      imageUrl: work.imageUrl,
      imageKey: work.imageKey ?? null,
      imageWidth: work.imageWidth,
      imageHeight: work.imageHeight,
      tags: JSON.stringify(work.tags),
      featured: Boolean(work.featured),
    };

    if (existing) {
      await prisma.work.update({
        where: { id: existing.id },
        data,
      });
      seededWorkIds.push(existing.id);
      continue;
    }

    const created = await prisma.work.create({
      data: {
        authorId: author.id,
        title: work.title,
        ...data,
      },
    });
    seededWorkIds.push(created.id);
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
    const weight = Math.max(1, seedViewerIds.length - workIndex);
    const activeViewers = seedViewerIds.slice(0, weight);

    for (const [viewerIndex, userId] of activeViewers.entries()) {
      const existingView = await prisma.workView.findFirst({
        where: {
          userId,
          workId,
          viewerKey: 'seed-demo',
        },
        select: { id: true },
      });

      if (!existingView) {
        await prisma.workView.create({
          data: {
            userId,
            workId,
            viewerKey: 'seed-demo',
            viewedAt: new Date(Date.now() - (workIndex * 12 + viewerIndex) * 60 * 1000),
          },
        });
      }

      if (viewerIndex % 2 === 0) {
        await prisma.workLike.upsert({
          where: { userId_workId: { userId, workId } },
          update: {},
          create: { userId, workId },
        });
      }

      if (viewerIndex % 3 === 0) {
        await prisma.savedWork.upsert({
          where: { userId_workId: { userId, workId } },
          update: {},
          create: { userId, workId },
        });
      }
    }
  }
};

export const listHomeFeed = async (viewerId?: string | null): Promise<HomeFeedResponse> => {
  await ensureDatabaseSchema();
  await ensureSeedWorks();

  const works = await prisma.work.findMany({
    orderBy: [{ createdAt: 'desc' }],
    include: includeForViewer(viewerId),
  });

  const summaries = works.map((work) => mapWorkSummary(work, viewerId));
  const categories = Array.from(new Set(summaries.map((work) => work.category))).sort((a, b) => a.localeCompare(b, 'ru'));
  const popular = [...works]
    .sort((a, b) => getPopularScore(b) - getPopularScore(a))
    .map((work) => mapWorkSummary(work, viewerId));

  let recommendations = summaries;
  if (viewerId) {
    const interactions = await prisma.work.findMany({
      where: {
        OR: [
          { savedBy: { some: { userId: viewerId } } },
          { likes: { some: { userId: viewerId } } },
          { views: { some: { userId: viewerId } } },
        ],
      },
      select: {
        category: true,
        tags: true,
        authorId: true,
      },
    });

    const categoryWeights = new Map<string, number>();
    const tagWeights = new Map<string, number>();
    const authorWeights = new Map<string, number>();

    for (const item of interactions) {
      categoryWeights.set(item.category, (categoryWeights.get(item.category) ?? 0) + 3);
      authorWeights.set(item.authorId, (authorWeights.get(item.authorId) ?? 0) + 1);
      for (const tag of parseTags(item.tags)) {
        tagWeights.set(tag, (tagWeights.get(tag) ?? 0) + 1);
      }
    }

    recommendations = [...works]
      .sort((a, b) => {
        const score = (work: WorkWithAuthor) => {
          const tags = parseTags(work.tags);
          return (categoryWeights.get(work.category) ?? 0) * 4
            + tags.reduce((sum, tag) => sum + (tagWeights.get(tag) ?? 0), 0) * 2
            + (authorWeights.get(work.authorId) ?? 0)
            + getPopularScore(work) * 0.15;
        };
        return score(b) - score(a);
      })
      .map((work) => mapWorkSummary(work, viewerId));
  }

  return {
    categories,
    popular: popular.slice(0, 12),
    recommendations: recommendations.slice(0, 60),
  };
};

export const getWorkById = async (id: number, viewerId?: string | null): Promise<WorkDetail | null> => {
  await ensureDatabaseSchema();
  await ensureSeedWorks();

  const work = await prisma.work.findUnique({
    where: { id },
    include: includeDetailForViewer(viewerId),
  });

  return work ? mapWorkDetail(work, viewerId) : null;
};

export const listUserWorks = async (authorId: string, viewerId?: string | null): Promise<WorkSummary[]> => {
  await ensureDatabaseSchema();
  await ensureSeedWorks();

  const works = await prisma.work.findMany({
    where: { authorId },
    orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    include: includeForViewer(viewerId),
  });

  return works.map((work) => mapWorkSummary(work, viewerId));
};

export const createWork = async (authorId: string, input: CreateWorkInput): Promise<WorkDetail> => {
  await ensureDatabaseSchema();

  const work = await prisma.work.create({
    data: {
      authorId,
      title: input.title,
      category: input.category,
      description: input.description,
      imageUrl: input.imageUrl,
      imageKey: input.imageKey ?? null,
      imageWidth: input.imageWidth,
      imageHeight: input.imageHeight,
      tags: JSON.stringify(input.tags),
      featured: Boolean(input.featured),
    },
    include: includeDetailForViewer(authorId),
  });

  return mapWorkDetail(work, authorId);
};

export type UpdateWorkInput = {
  title: string;
  category: string;
  description: string;
  tags: string[];
  image?: {
    imageUrl: string;
    imageKey: string | null;
    imageWidth: number;
    imageHeight: number;
  };
};

export const getWorkOwnerInfo = async (id: number) => {
  await ensureDatabaseSchema();
  return prisma.work.findUnique({
    where: { id },
    select: {
      id: true,
      authorId: true,
      imageKey: true,
    },
  });
};

export const updateWork = async (id: number, input: UpdateWorkInput): Promise<WorkDetail | null> => {
  await ensureDatabaseSchema();

  const work = await prisma.work.update({
    where: { id },
    data: {
      title: input.title,
      category: input.category,
      description: input.description,
      tags: JSON.stringify(input.tags),
      ...(input.image
        ? {
            imageUrl: input.image.imageUrl,
            imageKey: input.image.imageKey,
            imageWidth: input.image.imageWidth,
            imageHeight: input.image.imageHeight,
          }
        : {}),
    },
    include: includeDetailForViewer(),
  });

  return mapWorkDetail(work);
};

export const deleteWork = async (id: number) => {
  await ensureDatabaseSchema();
  await prisma.work.delete({ where: { id } });
};
