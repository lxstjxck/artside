'use client';

import { use, useState } from 'react';

type ProfilePageProps = {
  params: Promise<{
    username: string;
  }>;
};

type UserWork = {
  id: number;
  title: string;
  category: string;
  featured?: boolean;
};

type SavedRecommendation = {
  id: number;
  ratio: {
    width: number;
    height: number;
  };
};

const SAVED_RECOMMENDATIONS_KEY = 'artside.savedRecommendations';

const userWorks: UserWork[] = [
  { id: 1, title: 'Работа 1', category: 'Иллюстрация', featured: true },
  { id: 2, title: 'Работа 2', category: 'Иллюстрация', featured: true },
  { id: 3, title: 'Работа 3', category: 'UI/UX', featured: true },
  { id: 4, title: 'Работа 4', category: 'Дизайн сайтов', featured: true },
  { id: 5, title: 'Работа 5', category: 'Иллюстрация' },
  { id: 6, title: 'Работа 6', category: 'Иллюстрация' },
  { id: 7, title: 'Работа 7', category: 'Иллюстрация' },
  { id: 8, title: 'Работа 8', category: 'Дизайн сайтов' },
  { id: 9, title: 'Работа 9', category: 'Дизайн сайтов' },
  { id: 10, title: 'Работа 10', category: 'UI/UX' },
  { id: 11, title: 'Работа 11', category: 'UI/UX' },
  { id: 12, title: 'Работа 12', category: 'Fan art' },
];

const recommendationPool: SavedRecommendation[] = Array.from({ length: 16 }, (_, index) => ({
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
}));

export default function ProfilePage({ params }: ProfilePageProps) {
  const { username } = use(params);
  const [isEditing, setIsEditing] = useState(false);
  const [savedRecommendations] = useState<SavedRecommendation[]>(() => {
    if (typeof window === 'undefined') return [];

    const saved = window.localStorage.getItem(SAVED_RECOMMENDATIONS_KEY);
    if (!saved) return [];

    try {
      const savedIds = JSON.parse(saved) as number[];
      return recommendationPool.filter((item) => savedIds.includes(item.id));
    } catch {
      window.localStorage.removeItem(SAVED_RECOMMENDATIONS_KEY);
      return [];
    }
  });
  const [profile, setProfile] = useState({
    avatarUrl: '',
    nickname: username.toUpperCase(),
    location: 'Москва, Россия',
    bio: 'Цифровой художник и дизайнер интерфейсов. Исследую визуальные ритмы, собираю атмосферные сцены и работаю на стыке иллюстрации, айдентики и веба.',
  });

  const featuredWorks = userWorks.filter((work) => work.featured).slice(0, 4);
  const publishedWorks = userWorks.filter((work) => !work.featured);
  const categorySections = Array.from(new Set(publishedWorks.map((work) => work.category))).map((category) => ({
    category,
    works: publishedWorks.filter((work) => work.category === category),
  }));

  const updateProfile = (field: keyof typeof profile, value: string) => {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <main className="min-h-[calc(100vh-90px)] bg-[#111111] px-4 py-4 lg:px-8 lg:py-5">
      <div className="mx-auto grid w-full max-w-[1840px] grid-cols-1 gap-6 xl:grid-cols-[408px_minmax(0,1fr)]">
        <aside className="rounded-[28px] bg-[linear-gradient(110deg,#ba7ea3_0%,#b694ba_34%,#8ea9d4_72%,#84b6dc_100%)] p-5 text-[#111111] shadow-soft">
          <div className="flex flex-col items-center">
            <div className="mb-5 flex h-40 w-40 items-center justify-center overflow-hidden rounded-full bg-[#111111]">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Аватар профиля" className="h-full w-full object-cover" />
              ) : (
                <svg width="62" height="62" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6">
                  <circle cx="12" cy="8" r="4.2" />
                  <path d="M5 20c1.3-3.2 4.1-4.8 7-4.8s5.7 1.6 7 4.8" />
                </svg>
              )}
            </div>

            {isEditing ? (
              <input
                type="text"
                value={profile.nickname}
                onChange={(event) => updateProfile('nickname', event.target.value)}
                className="mb-5 w-full rounded-xl border border-black/15 bg-white/55 px-4 py-2 text-center text-2xl font-black tracking-wide text-black outline-none"
              />
            ) : (
              <h1 className="mb-5 text-center text-[2rem] font-black tracking-wide">{profile.nickname}</h1>
            )}

            <div className="mb-5 flex w-full items-center gap-3 text-sm font-medium text-black/80">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {isEditing ? (
                <input
                  type="text"
                  value={profile.location}
                  onChange={(event) => updateProfile('location', event.target.value)}
                  className="w-full rounded-lg border border-black/15 bg-white/55 px-3 py-2 text-sm text-black outline-none"
                />
              ) : (
                <span>{profile.location}</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsEditing((value) => !value)}
              className="mb-5 h-12 w-full rounded-xl bg-[#111111] px-4 text-sm font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#1c1c1c]"
            >
              {isEditing ? 'Сохранить' : 'Редактировать'}
            </button>

            {isEditing && (
              <input
                type="text"
                value={profile.avatarUrl}
                onChange={(event) => updateProfile('avatarUrl', event.target.value)}
                placeholder="Ссылка на аватар"
                className="mb-5 w-full rounded-xl border border-black/15 bg-white/55 px-4 py-3 text-sm text-black outline-none placeholder:text-black/45"
              />
            )}

            <div className="w-full rounded-[22px] bg-white/42 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_14px_34px_rgba(0,0,0,0.12)] backdrop-blur-sm">
              {isEditing ? (
                <textarea
                  value={profile.bio}
                  onChange={(event) => updateProfile('bio', event.target.value)}
                  className="min-h-[210px] w-full resize-none rounded-xl border border-black/10 bg-white/58 p-4 text-sm leading-6 text-black/80 outline-none"
                />
              ) : (
                <p className="min-h-[210px] text-sm leading-6 text-black/78">{profile.bio}</p>
              )}
            </div>
          </div>
        </aside>

        <section className="space-y-7 pt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {featuredWorks.map((work) => (
              <div key={work.id} className="space-y-2">
                <div className="aspect-[4/3] rounded-[4px] bg-[#8b8b8b]" />
                <p className="text-xs uppercase tracking-[0.08em] text-white/72">{work.title}</p>
              </div>
            ))}
          </div>

          {savedRecommendations.length > 0 && (
            <div className="space-y-4">
              <span className="inline-flex rounded-lg bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-black">
                Сохраненки
              </span>
              <div className="recommend-masonry">
                {savedRecommendations.map((item) => (
                  <article key={item.id} className="recommend-card">
                    <div
                      className="recommend-card-media"
                      style={{ aspectRatio: `${item.ratio.width} / ${item.ratio.height}` }}
                    />
                  </article>
                ))}
              </div>
            </div>
          )}

          {categorySections.map((section) => (
            <div key={section.category} className="space-y-4">
              <span className="inline-flex rounded-lg bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-black">
                {section.category}
              </span>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                {section.works.map((work) => (
                  <div key={work.id} className="space-y-2">
                    <div className="aspect-square rounded-lg bg-[#8b8b8b]" />
                    <p className="text-xs uppercase tracking-[0.08em] text-white/72">{work.title}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
