import { homeFeedData } from '@/lib/home-feed';

export type WorkKind = 'popular' | 'recommendation';

export type WorkComment = {
  id: number;
  author: string;
  text: string;
  postedAt: string;
};

export type WorkDetail = {
  slug: string;
  kind: WorkKind;
  id: number;
  title: string;
  author: string;
  description: string;
  views: number;
  likes: number;
  comments: WorkComment[];
  tags: string[];
  publishedAt: string;
  aspectRatio: string;
};

const staticComments = (id: number): WorkComment[] => [
  {
    id: id * 10 + 1,
    author: `designer_${id}`,
    text: 'Очень сильная композиция и аккуратный свет.',
    postedAt: '2 ч назад',
  },
  {
    id: id * 10 + 2,
    author: `artlover_${id}`,
    text: 'Отличный ритм, особенно понравилась детализация.',
    postedAt: '5 ч назад',
  },
  {
    id: id * 10 + 3,
    author: `ui_focus_${id}`,
    text: 'Забрал в сохраненки, крутая подача.',
    postedAt: 'вчера',
  },
];

const baseTags = ['portfolio', 'digital art', 'showcase', 'concept'];

const popularDetails: WorkDetail[] = homeFeedData.popular.map((item) => ({
  slug: `popular-${item.id}`,
  kind: 'popular',
  id: item.id,
  title: `Popular Work #${item.id}`,
  author: item.author,
  description: 'Серия экспериментальных визуальных решений с акцентом на форму, объем и атмосферу сцены.',
  views: 900 + item.id * 37,
  likes: 120 + item.id * 9,
  comments: staticComments(item.id),
  tags: [...baseTags, 'popular'],
  publishedAt: `${(item.id % 28) + 1} апреля 2026`,
  aspectRatio: '1 / 1',
}));

const recommendationDetails: WorkDetail[] = homeFeedData.recommendations.map((item) => ({
  slug: `recommendation-${item.id}`,
  kind: 'recommendation',
  id: item.id,
  title: `Recommended Work #${item.id}`,
  author: `creator_${item.id}`,
  description: 'Работа из персональной подборки: акцент на художественный стиль, читаемость силуэта и цветовой контраст.',
  views: 600 + item.id * 21,
  likes: 80 + item.id * 6,
  comments: staticComments(item.id + 100),
  tags: [...baseTags, 'recommendation'],
  publishedAt: `${(item.id % 28) + 1} марта 2026`,
  aspectRatio: `${item.ratio.width} / ${item.ratio.height}`,
}));

const allWorks = [...popularDetails, ...recommendationDetails];

export const getWorkBySlug = (slug: string): WorkDetail | null => {
  return allWorks.find((work) => work.slug === slug) ?? null;
};
