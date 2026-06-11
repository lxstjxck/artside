import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

const prisma = new PrismaClient();

const passwordHash = '$2a$10$uXcfb3w58JrTuA4y9.PJdOD1p6NHHgG2hrVbp7X8Be4OZ26LvfFM.';

const authors = [
  {
    id: 'seed-author-mira',
    username: 'mira_visual',
    email: 'mira.visual@artside.local',
    nickname: 'Mira Visual',
    location: 'Москва',
    bio: 'Графический дизайнер и арт-директор. Собирает айдентику, постеры и редакционные системы.',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80',
    professionalSkills: ['Айдентика', 'Постеры', 'Типографика', 'Арт-дирекшн'],
    professionalSoftware: ['Figma', 'Adobe Illustrator', 'Adobe Photoshop'],
    publicEmail: 'mira.visual@example.com',
    socialLinks: {
      behance: 'https://www.behance.net/',
      telegram: 'https://t.me/',
      website: 'https://example.com/mira',
    },
  },
  {
    id: 'seed-author-roman',
    username: 'roman_ui',
    email: 'roman.ui@artside.local',
    nickname: 'Roman UI',
    location: 'Санкт-Петербург',
    bio: 'Product designer. Проектирует интерфейсы, дизайн-системы и мобильные сценарии.',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=320&q=80',
    professionalSkills: ['UI/UX', 'Design systems', 'Mobile flows', 'Dashboards'],
    professionalSoftware: ['Figma', 'FigJam', 'Principle'],
    publicEmail: 'roman.ui@example.com',
    socialLinks: {
      telegram: 'https://t.me/',
      vk: 'https://vk.com/',
      website: 'https://example.com/roman',
    },
  },
  {
    id: 'seed-author-alina',
    username: 'alina_3d',
    email: 'alina.3d@artside.local',
    nickname: 'Alina 3D',
    location: 'Казань',
    bio: '3D artist. Делает предметные рендеры, motion-постеры и визуальные эксперименты.',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=320&q=80',
    professionalSkills: ['3D render', 'Motion', 'Lookdev', 'Lighting'],
    professionalSoftware: ['Blender', 'Cinema 4D', 'After Effects'],
    publicEmail: 'alina.3d@example.com',
    socialLinks: {
      artstation: 'https://www.artstation.com/',
      telegram: 'https://t.me/',
    },
  },
  {
    id: 'seed-author-stepan',
    username: 'stepan_photo',
    email: 'stepan.photo@artside.local',
    nickname: 'Stepan Photo',
    location: 'Екатеринбург',
    bio: 'Фотограф и визуальный редактор. Работает с портретами, предметной съемкой и городскими сериями.',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=320&q=80',
    professionalSkills: ['Портрет', 'Editorial photo', 'Color grading'],
    professionalSoftware: ['Lightroom', 'Capture One', 'Photoshop'],
    publicEmail: 'stepan.photo@example.com',
    socialLinks: {
      vk: 'https://vk.com/',
      website: 'https://example.com/stepan',
    },
  },
  {
    id: 'seed-author-nika',
    username: 'nika_gameart',
    email: 'nika.gameart@artside.local',
    nickname: 'Nika Gameart',
    location: 'Новосибирск',
    bio: 'Concept artist. Прорабатывает персонажей, пропсы и визуальные листы для игровых проектов.',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=320&q=80',
    professionalSkills: ['Concept art', 'Character design', 'Props', 'Game art'],
    professionalSoftware: ['Photoshop', 'Procreate', 'Blender'],
    publicEmail: 'nika.gameart@example.com',
    socialLinks: {
      artstation: 'https://www.artstation.com/',
      behance: 'https://www.behance.net/',
    },
  },
];

const works = [
  {
    author: 'mira_visual',
    title: 'Editorial Identity System',
    category: 'Графический дизайн',
    description: 'Система визуальной идентичности для независимого медиа: сетка, постеры, обложки и цифровые носители.',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    width: 1200,
    height: 1200,
    tags: ['identity', 'poster', 'editorial'],
    featured: true,
  },
  {
    author: 'roman_ui',
    title: 'Product Launch Screens',
    category: 'UI/UX',
    description: 'Набор экранов для запуска продукта: карточки функций, onboarding, pricing и мобильная адаптация.',
    imageUrl: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&w=1200&q=80',
    width: 1200,
    height: 900,
    tags: ['ui', 'product', 'mobile'],
    featured: true,
  },
  {
    author: 'alina_3d',
    title: 'Motion Poster Frames',
    category: '3D art',
    description: 'Кадры для анимированного постера с объемной типографикой, стеклом и направленным светом.',
    imageUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=1200&q=80',
    width: 1200,
    height: 1500,
    tags: ['3d', 'motion', 'typography'],
    featured: true,
  },
  {
    author: 'stepan_photo',
    title: 'Studio Portrait Series',
    category: 'Фотография',
    description: 'Портретная серия с акцентом на естественную пластику, мягкий контраст и чистый фон.',
    imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=80',
    width: 1000,
    height: 1500,
    tags: ['portrait', 'photo', 'studio'],
    featured: true,
  },
  {
    author: 'nika_gameart',
    title: 'Character Concept Pack',
    category: 'Game art',
    description: 'Серия концептов персонажей с вариациями силуэта, материалов и цветовых акцентов.',
    imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
    width: 1200,
    height: 1600,
    tags: ['gameart', 'character', 'concept'],
    featured: true,
  },
  {
    author: 'mira_visual',
    title: 'Minimal Brand Cards',
    category: 'Графический дизайн',
    description: 'Серия бренд-карточек с лаконичной типографикой, контрастными парами и печатными фактурами.',
    imageUrl: 'https://images.unsplash.com/photo-1558655146-364adaf1fcc9?auto=format&fit=crop&w=1200&q=80',
    width: 1200,
    height: 1500,
    tags: ['brand', 'print', 'cards'],
  },
  {
    author: 'roman_ui',
    title: 'Control Panel UI',
    category: 'UI/UX',
    description: 'Плотный интерфейс панели управления с таблицами, быстрыми фильтрами и статусами.',
    imageUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=80',
    width: 1200,
    height: 780,
    tags: ['dashboard', 'control', 'saas'],
  },
  {
    author: 'alina_3d',
    title: 'Glass Object Study',
    category: '3D art',
    description: 'Тест прозрачных материалов, отражений и мягких теней на простой предметной сцене.',
    imageUrl: 'https://images.unsplash.com/photo-1604076913837-52ab5629fba9?auto=format&fit=crop&w=1200&q=80',
    width: 1000,
    height: 1250,
    tags: ['3d', 'glass', 'render'],
  },
  {
    author: 'stepan_photo',
    title: 'Editorial Photo Diptych',
    category: 'Фотография',
    description: 'Редакционный диптих с контрастом крупного плана и общей сцены.',
    imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    width: 1200,
    height: 1600,
    tags: ['editorial', 'photo', 'diptych'],
  },
  {
    author: 'nika_gameart',
    title: 'Sci-Fi Prop Sheet',
    category: 'Game art',
    description: 'Лист игровых пропсов с вариантами материалов, форм и цветовой маркировки.',
    imageUrl: 'https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&w=1200&q=80',
    width: 1200,
    height: 950,
    tags: ['props', 'sci-fi', 'game'],
  },
  {
    author: 'roman_ui',
    title: 'Mobile Finance Flow',
    category: 'UI/UX',
    description: 'Мобильный сценарий финансового приложения: аналитика, платежи, лимиты и быстрые действия.',
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    width: 900,
    height: 1400,
    tags: ['mobile', 'finance', 'dashboard'],
  },
  {
    author: 'mira_visual',
    title: 'Fan Poster Collection',
    category: 'Fan art',
    description: 'Коллекция фанатских постеров с декоративной типографикой и плотной работой с цветом.',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=1200&q=80',
    width: 900,
    height: 1400,
    tags: ['fanart', 'poster', 'color'],
  },
  {
    author: 'stepan_photo',
    title: 'Quiet Workspace',
    category: 'Фотография',
    description: 'Фотосерия рабочего пространства с мягким дневным светом и спокойной композицией.',
    imageUrl: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80',
    width: 1200,
    height: 720,
    tags: ['photo', 'workspace', 'light'],
  },
  {
    author: 'alina_3d',
    title: 'Packaging Variants',
    category: 'Дизайн продуктов',
    description: 'Варианты упаковки с цветовой системой, маркировкой линейки и печатными деталями.',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
    width: 900,
    height: 1200,
    tags: ['packaging', 'product', 'color'],
  },
  {
    author: 'nika_gameart',
    title: 'Album Fan Cover',
    category: 'Fan art',
    description: 'Фанатская обложка альбома с крупным образом, плотным цветом и декоративной сеткой.',
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80',
    width: 1200,
    height: 1200,
    tags: ['music', 'cover', 'fanart'],
  },
  {
    author: 'mira_visual',
    title: 'Landing Page System',
    category: 'Дизайн сайтов',
    description: 'Комплект секций для продуктовой страницы: навигация, карточки, тарифы и блок доверия.',
    imageUrl: 'https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=1200&q=80',
    width: 1200,
    height: 900,
    tags: ['web', 'landing', 'sections'],
  },
  {
    author: 'roman_ui',
    title: 'Commerce Design Kit',
    category: 'Дизайн продуктов',
    description: 'Компоненты для e-commerce интерфейса: карточки товара, фильтры, checkout и пустая корзина.',
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    width: 1200,
    height: 760,
    tags: ['product', 'commerce', 'design-system'],
  },
  {
    author: 'alina_3d',
    title: 'Spatial Type Render',
    category: '3D art',
    description: 'Объемная типографика в пространстве с контрастными материалами и ярким направленным светом.',
    imageUrl: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=80',
    width: 1200,
    height: 900,
    tags: ['3d', 'type', 'render'],
  },
  {
    author: 'stepan_photo',
    title: 'Urban Facade Rhythm',
    category: 'Архитектура',
    description: 'Визуальное исследование фасадного ритма, повторяющихся модулей и вертикального масштаба.',
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
    width: 900,
    height: 1350,
    tags: ['facade', 'urban', 'geometry'],
  },
  {
    author: 'nika_gameart',
    title: 'Creature Silhouette Sheet',
    category: 'Game art',
    description: 'Лист силуэтов существ для раннего этапа концепта: поиск массы, пластики и читаемости формы.',
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    width: 1200,
    height: 900,
    tags: ['creature', 'silhouette', 'concept'],
  },
];

const viewerIds = Array.from({ length: 12 }, (_, index) => `seed-demo-viewer-${index + 1}`);

const ensureFollowTable = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "UserFollow" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "followerId" TEXT NOT NULL,
      "followingId" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "UserFollow_followerId_followingId_key" ON "UserFollow"("followerId", "followingId");');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "UserFollow_followingId_idx" ON "UserFollow"("followingId");');
};

const upsertAuthor = async (author) => {
  return prisma.user.upsert({
    where: { username: author.username },
    update: {
      email: author.email,
      profile: {
        upsert: {
          update: {
            nickname: author.nickname,
            location: author.location,
            bio: author.bio,
            avatarUrl: author.avatarUrl,
            professionalSkills: JSON.stringify(author.professionalSkills),
            professionalSoftware: JSON.stringify(author.professionalSoftware),
            publicEmail: author.publicEmail,
            showPublicEmail: true,
            hiringTypes: JSON.stringify(['freelance', 'contract', 'remote']),
            socialLinks: JSON.stringify(author.socialLinks),
            publishReady: true,
          },
          create: {
            nickname: author.nickname,
            location: author.location,
            bio: author.bio,
            avatarUrl: author.avatarUrl,
            professionalSkills: JSON.stringify(author.professionalSkills),
            professionalSoftware: JSON.stringify(author.professionalSoftware),
            publicEmail: author.publicEmail,
            showPublicEmail: true,
            hiringTypes: JSON.stringify(['freelance', 'contract', 'remote']),
            socialLinks: JSON.stringify(author.socialLinks),
            publishReady: true,
          },
        },
      },
    },
    create: {
      id: author.id,
      username: author.username,
      email: author.email,
      passwordHash,
      profile: {
        create: {
          nickname: author.nickname,
          location: author.location,
          bio: author.bio,
          avatarUrl: author.avatarUrl,
          professionalSkills: JSON.stringify(author.professionalSkills),
          professionalSoftware: JSON.stringify(author.professionalSoftware),
          publicEmail: author.publicEmail,
          showPublicEmail: true,
          hiringTypes: JSON.stringify(['freelance', 'contract', 'remote']),
          socialLinks: JSON.stringify(author.socialLinks),
          publishReady: true,
        },
      },
    },
  });
};

const upsertViewer = async (index) => {
  const id = viewerIds[index];
  return prisma.user.upsert({
    where: { id },
    update: {},
    create: {
      id,
      username: `demo_viewer_${index + 1}`,
      email: `demo.viewer.${index + 1}@artside.local`,
      passwordHash,
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
};

const upsertWork = async (authorId, work, index) => {
  const data = {
    category: work.category,
    description: work.description,
    status: 'published',
    imageUrl: work.imageUrl,
    imageKey: null,
    imageWidth: work.width,
    imageHeight: work.height,
    thumbnailUrl: work.imageUrl,
    thumbnailKey: null,
    thumbnailWidth: work.width,
    thumbnailHeight: work.height,
    tags: JSON.stringify(work.tags),
    featured: Boolean(work.featured),
    createdAt: new Date(Date.now() - index * 5 * 60 * 60 * 1000),
  };

  const existing = await prisma.work.findFirst({
    where: { authorId, title: work.title },
    select: { id: true },
  });

  const saved = existing
    ? await prisma.work.update({ where: { id: existing.id }, data })
    : await prisma.work.create({
        data: {
          authorId,
          title: work.title,
          ...data,
        },
      });

  await prisma.workImage.deleteMany({
    where: {
      workId: saved.id,
      sortOrder: 0,
    },
  });
  await prisma.workImage.create({
    data: {
      workId: saved.id,
      url: work.imageUrl,
      key: null,
      width: work.width,
      height: work.height,
      sortOrder: 0,
    },
  });

  return saved.id;
};

const seedActivity = async (workIds, authorMap, viewerUsers) => {
  for (const [workIndex, workId] of workIds.entries()) {
    const activeViewers = viewerUsers.slice(0, Math.max(3, viewerUsers.length - (workIndex % 8)));

    for (const [viewerIndex, viewer] of activeViewers.entries()) {
      await prisma.workView.create({
        data: {
          userId: viewer.id,
          workId,
          viewerKey: `seed-demo-${viewerIndex}`,
          viewedAt: new Date(Date.now() - (workIndex * 12 + viewerIndex) * 60 * 1000),
        },
      }).catch(() => undefined);

      if ((viewerIndex + workIndex) % 2 === 0) {
        await prisma.workLike.upsert({
          where: { userId_workId: { userId: viewer.id, workId } },
          update: {},
          create: { userId: viewer.id, workId },
        });
      }

      if ((viewerIndex + workIndex) % 3 === 0) {
        await prisma.savedWork.upsert({
          where: { userId_workId: { userId: viewer.id, workId } },
          update: {},
          create: { userId: viewer.id, workId },
        });
      }
    }

    const commenter = activeViewers[workIndex % activeViewers.length];
    const existingComment = await prisma.workComment.findFirst({
      where: {
        userId: commenter.id,
        workId,
        text: { startsWith: 'Демо-комментарий:' },
      },
      select: { id: true },
    });
    if (!existingComment) {
      await prisma.workComment.create({
        data: {
          userId: commenter.id,
          workId,
          text: `Демо-комментарий: сильная подача проекта и понятная визуальная идея #${workIndex + 1}.`,
        },
      });
    }
  }

  const authorUsers = Array.from(authorMap.values());
  for (const [viewerIndex, viewer] of viewerUsers.entries()) {
    for (const [authorIndex, author] of authorUsers.entries()) {
      if ((viewerIndex + authorIndex) % 2 === 0) {
        await prisma.userFollow.upsert({
          where: {
            followerId_followingId: {
              followerId: viewer.id,
              followingId: author.id,
            },
          },
          update: {},
          create: {
            followerId: viewer.id,
            followingId: author.id,
          },
        });
      }
    }
  }
};

async function main() {
  await ensureFollowTable();

  const authorEntries = await Promise.all(authors.map(upsertAuthor));
  const authorMap = new Map(authorEntries.map((author) => [author.username, author]));
  const viewerUsers = await Promise.all(viewerIds.map((_, index) => upsertViewer(index)));

  const workIds = [];
  for (const [index, work] of works.entries()) {
    const author = authorMap.get(work.author);
    if (!author) {
      throw new Error(`Missing seed author: ${work.author}`);
    }
    workIds.push(await upsertWork(author.id, work, index));
  }

  await seedActivity(workIds, authorMap, viewerUsers);

  console.log(`Demo seed completed: ${authors.length} authors, ${works.length} works, ${viewerUsers.length} viewers.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
