export type PopularWork = {
  id: number;
  author: string;
};

export type RecommendationWork = {
  id: number;
  ratio: {
    width: number;
    height: number;
  };
};

export type HomeFeedResponse = {
  categories: string[];
  popular: PopularWork[];
  recommendations: RecommendationWork[];
};

export const homeFeedData: HomeFeedResponse = {
  categories: [
    'Графический дизайн',
    'Фотография',
    '3D art',
    'Game art',
    'UI/UX',
    'Архитектура',
    'Дизайн продуктов',
    'Дизайн сайтов',
    'Fan art',
  ],
  popular: Array.from({ length: 30 }, (_, index) => ({
    id: index + 1,
    author: `author_${index + 1}`,
  })),
  recommendations: Array.from({ length: 16 }, (_, index) => ({
    id: index + 1,
    ratio: [
      { width: 4, height: 5 },
      { width: 4, height: 6 },
      { width: 3, height: 4 },
      { width: 4, height: 7 },
      { width: 1, height: 1 },
      { width: 5, height: 7 },
      { width: 4, height: 5 },
      { width: 3, height: 5 },
    ][index % 8],
  })),
};
