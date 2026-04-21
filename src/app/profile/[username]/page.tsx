'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { homeFeedData } from '@/lib/home-feed';
import type { SavedWorkItem } from '@/lib/saved-work-types';
import type { AuthUser, UserProfile } from '@/lib/auth-types';

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

type ProfileApiResponse = {
  user: AuthUser;
  profile: UserProfile;
  works: UserWork[];
  isOwner: boolean;
  authenticated: boolean;
};

export default function ProfilePage({ params }: ProfilePageProps) {
  const { username } = use(params);

  const [profileUser, setProfileUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [works, setWorks] = useState<UserWork[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [isSavedLoading, setIsSavedLoading] = useState(true);
  const [savedError, setSavedError] = useState<string | null>(null);
  const [savedItems, setSavedItems] = useState<SavedWorkItem[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    const loadProfile = async () => {
      try {
        setIsPageLoading(true);
        setPageError(null);

        const response = await fetch(`/api/profile/${encodeURIComponent(username)}`, {
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!response.ok) {
          if (response.status === 404) {
            setPageError('Профиль не найден.');
            return;
          }

          throw new Error(`Profile request failed: ${response.status}`);
        }

        const data = (await response.json()) as ProfileApiResponse;
        setProfileUser(data.user);
        setProfile(data.profile);
        setWorks(data.works ?? []);
        setIsOwner(data.isOwner);
        setIsAuthenticated(data.authenticated);
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        setPageError('Не удалось загрузить профиль. Попробуйте обновить страницу.');
      } finally {
        if (!controller.signal.aborted) {
          setIsPageLoading(false);
        }
      }
    };

    void loadProfile();

    return () => controller.abort();
  }, [username]);

  useEffect(() => {
    if (!isOwner || !isAuthenticated) {
      setSavedItems([]);
      setIsSavedLoading(false);
      return;
    }

    const controller = new AbortController();

    const loadSavedWorks = async () => {
      try {
        setIsSavedLoading(true);
        setSavedError(null);

        const response = await fetch('/api/saved-works', {
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Saved works request failed: ${response.status}`);
        }

        const data = (await response.json()) as { authenticated: boolean; items: SavedWorkItem[] };
        if (!data.authenticated) {
          setSavedItems([]);
          return;
        }

        setSavedItems(data.items ?? []);
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        setSavedError('Не удалось загрузить сохраненные работы.');
      } finally {
        if (!controller.signal.aborted) {
          setIsSavedLoading(false);
        }
      }
    };

    void loadSavedWorks();

    return () => controller.abort();
  }, [isOwner, isAuthenticated]);

  const featuredWorks = works.filter((work) => work.featured).slice(0, 4);
  const publishedWorks = works.filter((work) => !work.featured);
  const categorySections = Array.from(new Set(publishedWorks.map((work) => work.category))).map((category) => ({
    category,
    works: publishedWorks.filter((work) => work.category === category),
  }));

  const recommendationMap = useMemo(
    () => new Map(homeFeedData.recommendations.map((item) => [item.id, item])),
    []
  );
  const popularMap = useMemo(
    () => new Map(homeFeedData.popular.map((item) => [item.id, item])),
    []
  );

  const savedCards = savedItems
    .map((item) => {
      if (item.kind === 'popular') {
        const popular = popularMap.get(item.id);
        if (!popular) return null;
        return {
          key: `saved-popular-${item.id}`,
          aspectRatio: '1 / 1',
          title: popular.author,
        };
      }

      const recommendation = recommendationMap.get(item.id);
      if (!recommendation) return null;
      return {
        key: `saved-recommend-${item.id}`,
        aspectRatio: `${recommendation.ratio.width} / ${recommendation.ratio.height}`,
        title: '',
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const updateProfileField = (field: keyof UserProfile, value: string) => {
    setProfile((current) => {
      if (!current) return current;
      return {
        ...current,
        [field]: value,
      };
    });
  };

  const submitProfileChanges = async () => {
    if (!profile || !isOwner) return;

    try {
      setIsSavingProfile(true);
      setProfileMessage(null);

      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });

      const data = (await response.json()) as { message?: string; profile?: UserProfile };

      if (!response.ok || !data.profile) {
        setProfileMessage(data.message ?? 'Не удалось сохранить изменения профиля.');
        return;
      }

      setProfile(data.profile);
      setProfileMessage('Профиль сохранен.');
      setIsEditing(false);
    } catch {
      setProfileMessage('Сетевая ошибка при сохранении профиля.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (isPageLoading) {
    return (
      <main className="min-h-[calc(100vh-90px)] bg-[#111111] px-4 py-8 lg:px-8">
        <p className="text-sm text-white/75">Загрузка профиля...</p>
      </main>
    );
  }

  if (pageError || !profile || !profileUser) {
    return (
      <main className="min-h-[calc(100vh-90px)] bg-[#111111] px-4 py-8 lg:px-8">
        <p className="text-sm text-red-300">{pageError ?? 'Профиль недоступен.'}</p>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-90px)] bg-[#111111] px-4 py-4 lg:px-8 lg:py-5">
      <div className="mx-auto grid w-full max-w-[1840px] grid-cols-1 gap-6 xl:grid-cols-[408px_minmax(0,1fr)]">
        <aside className="rounded-[28px] bg-[linear-gradient(90deg,#ba7ea3_0%,#b694ba_35%,#8ea9d4_75%,#84b6dc_100%)] p-5 text-[#111111] shadow-soft">
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
                onChange={(event) => updateProfileField('nickname', event.target.value)}
                className="mb-5 w-full rounded-xl border border-black/15 bg-white/55 px-4 py-2 text-center text-2xl font-black tracking-wide text-black outline-none"
                disabled={!isOwner || isSavingProfile}
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
                  onChange={(event) => updateProfileField('location', event.target.value)}
                  className="w-full rounded-lg border border-black/15 bg-white/55 px-3 py-2 text-sm text-black outline-none"
                  disabled={!isOwner || isSavingProfile}
                />
              ) : (
                <span>{profile.location}</span>
              )}
            </div>

            {isOwner ? (
              <button
                type="button"
                onClick={() => {
                  if (isEditing) {
                    void submitProfileChanges();
                    return;
                  }
                  setIsEditing(true);
                  setProfileMessage(null);
                }}
                disabled={isSavingProfile}
                className="mb-5 h-12 w-full rounded-xl bg-[#111111] px-4 text-sm font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#1c1c1c] disabled:opacity-60"
              >
                {isSavingProfile ? 'Сохраняем...' : isEditing ? 'Сохранить' : 'Редактировать'}
              </button>
            ) : (
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.14em] text-black/70">Публичный профиль</p>
            )}

            {profileMessage && (
              <p className={`mb-4 text-sm ${profileMessage.includes('сохранен') ? 'text-emerald-800' : 'text-red-700'}`}>
                {profileMessage}
              </p>
            )}

            {isEditing && isOwner && (
              <input
                type="text"
                value={profile.avatarUrl}
                onChange={(event) => updateProfileField('avatarUrl', event.target.value)}
                placeholder="Ссылка на аватар"
                className="mb-5 w-full rounded-xl border border-black/15 bg-white/55 px-4 py-3 text-sm text-black outline-none placeholder:text-black/45"
                disabled={isSavingProfile}
              />
            )}

            <div className="w-full rounded-[22px] bg-white/42 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_14px_34px_rgba(0,0,0,0.12)] backdrop-blur-sm">
              {isEditing ? (
                <textarea
                  value={profile.bio}
                  onChange={(event) => updateProfileField('bio', event.target.value)}
                  className="min-h-[210px] w-full resize-none rounded-xl border border-black/10 bg-white/58 p-4 text-sm leading-6 text-black/80 outline-none"
                  disabled={!isOwner || isSavingProfile}
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

          {isOwner && (
            <div className="space-y-4">
              <span className="inline-flex rounded-lg bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-black">
                Сохраненки
              </span>

              {isSavedLoading && <p className="text-sm text-white/65">Загрузка сохраненных работ...</p>}
              {savedError && <p className="text-sm text-red-300">{savedError}</p>}
              {!isSavedLoading && !savedError && savedCards.length === 0 && (
                <p className="text-sm text-white/70">У вас пока нет сохраненных работ.</p>
              )}

              {!isSavedLoading && !savedError && savedCards.length > 0 && (
                <div className="recommend-masonry">
                  {savedCards.map((item) => (
                    <article key={item.key} className="recommend-card">
                      <div
                        className="recommend-card-media"
                        style={{ aspectRatio: item.aspectRatio }}
                      />
                      {item.title && <p className="px-2 py-2 text-xs uppercase tracking-[0.08em] text-white/72">{item.title}</p>}
                    </article>
                  ))}
                </div>
              )}
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
