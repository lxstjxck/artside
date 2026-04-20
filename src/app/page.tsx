'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { HomeFeedResponse } from '@/lib/home-feed';

const SAVED_POPULAR_KEY = 'artside.savedPopular';
const SAVED_RECOMMENDATIONS_KEY = 'artside.savedRecommendations';
const SAVED_STORAGE_EVENT = 'artside-saved-updated';
const EMPTY_IDS: number[] = [];
const savedIdsSnapshotCache = new Map<string, { raw: string | null; ids: number[] }>();

const getSavedIdsSnapshot = (key: string): number[] => {
  if (typeof window === 'undefined') return EMPTY_IDS;

  let raw = window.localStorage.getItem(key);
  const cached = savedIdsSnapshotCache.get(key);
  if (cached && cached.raw === raw) return cached.ids;

  let ids = EMPTY_IDS;
  try {
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const normalized = parsed.filter((id) => Number.isInteger(id));
        ids = normalized.length > 0 ? normalized : EMPTY_IDS;
      }
    }
  } catch {
    window.localStorage.removeItem(key);
    raw = null;
    ids = EMPTY_IDS;
  }

  savedIdsSnapshotCache.set(key, { raw, ids });
  return ids;
};

const subscribeSavedIds = (callback: () => void) => {
  if (typeof window === 'undefined') return () => {};

  const onStorage = () => callback();
  const onSavedUpdated = () => callback();

  window.addEventListener('storage', onStorage);
  window.addEventListener(SAVED_STORAGE_EVENT, onSavedUpdated);

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(SAVED_STORAGE_EVENT, onSavedUpdated);
  };
};

const updateSavedIds = (key: string, id: number) => {
  const current = getSavedIdsSnapshot(key);
  const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
  const raw = JSON.stringify(next);
  window.localStorage.setItem(key, raw);
  savedIdsSnapshotCache.set(key, { raw, ids: next });
  window.dispatchEvent(new Event(SAVED_STORAGE_EVENT));
};

export default function Home() {
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [feed, setFeed] = useState<HomeFeedResponse | null>(null);
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const savedPopularIds = useSyncExternalStore(
    subscribeSavedIds,
    () => getSavedIdsSnapshot(SAVED_POPULAR_KEY),
    () => EMPTY_IDS
  );
  const savedRecommendationIds = useSyncExternalStore(
    subscribeSavedIds,
    () => getSavedIdsSnapshot(SAVED_RECOMMENDATIONS_KEY),
    () => EMPTY_IDS
  );
  const popularRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadFeed = async () => {
      try {
        const response = await fetch('/api/home-feed', {
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Feed request failed: ${response.status}`);
        }

        const data = (await response.json()) as HomeFeedResponse;
        setFeed(data);
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        setFeedError('Не удалось загрузить данные. Обновите страницу.');
      } finally {
        if (!controller.signal.aborted) {
          setIsFeedLoading(false);
        }
      }
    };

    loadFeed();

    return () => controller.abort();
  }, []);

  const categories = feed?.categories ?? [];
  const popularItems = feed?.popular ?? [];
  const recommendedItems = feed?.recommendations ?? [];

  const toggleCategory = (category: string) => {
    setActiveCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  };

  const clearCategories = () => {
    setActiveCategories([]);
  };

  const toggleSavedPopular = (popularId: number) => {
    updateSavedIds(SAVED_POPULAR_KEY, popularId);
  };

  const toggleSavedRecommendation = (recommendationId: number) => {
    updateSavedIds(SAVED_RECOMMENDATIONS_KEY, recommendationId);
  };

  const scrollPopular = (dir: number) => {
    if (!popularRef.current) return;
    const track = popularRef.current;
    const card = track.querySelector('.popular-card') as HTMLElement | null;
    const styles = window.getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || '24') || 24;
    const amount = card ? card.offsetWidth + gap : 300;
    const maxScrollLeft = track.scrollWidth - track.clientWidth;
    const nextScrollLeft = track.scrollLeft + dir * amount;
    const edgeThreshold = 2;

    if (dir > 0 && nextScrollLeft >= maxScrollLeft - edgeThreshold) {
      track.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }

    if (dir < 0 && nextScrollLeft <= edgeThreshold) {
      track.scrollTo({ left: maxScrollLeft, behavior: 'smooth' });
      return;
    }

    track.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  return (
    <main>
      <section className="pb-6">
        <div className="flex w-full flex-wrap items-center justify-between gap-4 px-10 pb-6">
          <div className="flex items-center gap-3">
            <button className="chip chip-dark">Отслеживаемое</button>
            <button className="chip chip-dark">Понравившееся</button>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {activeCategories.length > 0 && (
              <button
                className="clear-categories-btn"
                onClick={clearCategories}
                aria-label="Очистить выбранные категории"
                type="button"
              >
                ×
              </button>
            )}

            {categories.map((item) => (
              <button
                key={item}
                className={`chip ${activeCategories.includes(item) ? 'chip-dark' : 'chip-light'}`}
                onClick={() => toggleCategory(item)}
                aria-pressed={activeCategories.includes(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="section-dark">
        <div className="w-full px-10">
          <h2 className="section-title">Популярное</h2>
          {isFeedLoading && !feedError && <p className="mb-3 text-sm text-white/65">Загрузка ленты...</p>}
          {feedError && <p className="mb-3 text-sm text-red-300">{feedError}</p>}
          <div className="relative">
            <button className="nav-arrow nav-arrow-left" onClick={() => scrollPopular(-1)} aria-label="Назад" type="button">
              ‹
            </button>
            <button className="nav-arrow nav-arrow-right" onClick={() => scrollPopular(1)} aria-label="Вперед" type="button">
              ›
            </button>

            <div ref={popularRef} className="popular-track">
              {popularItems.map((item) => (
                <div key={item.id} className="popular-card snap-start">
                  <div className="popular-thumb">
                    <div className="popular-overlay">
                      <button
                        type="button"
                        aria-label={savedPopularIds.includes(item.id) ? 'Убрать работу из сохраненок' : 'Сохранить работу в профиль'}
                        className={`save-work-btn ${savedPopularIds.includes(item.id) ? 'save-work-btn-active' : ''}`}
                        onClick={() => toggleSavedPopular(item.id)}
                      >
                        <span className="save-work-icon save-work-icon-default" aria-hidden="true">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H11l2 2h4.5A2.5 2.5 0 0 1 20 9.5v7a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
                          </svg>
                        </span>
                        <span className="save-work-icon save-work-icon-check" aria-hidden="true">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="m5 12 4.2 4.2L19 7.8" />
                          </svg>
                        </span>
                      </button>
                    </div>
                  </div>
                  <div className="popular-meta">
                    <span className="popular-title">{item.author}</span>
                    <span className="popular-dot" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="section-divider" />

        <div className="w-full px-10 pb-12">
          <h2 className="section-title">Рекомендации для вас</h2>
          <div className="recommend-masonry">
            {recommendedItems.map((item) => (
              <article key={item.id} className="recommend-card">
                <div
                  className="recommend-card-media"
                  style={{ aspectRatio: `${item.ratio.width} / ${item.ratio.height}` }}
                >
                  <div className="recommend-card-overlay">
                    <button
                      type="button"
                      aria-label={savedRecommendationIds.includes(item.id) ? 'Убрать из сохраненок' : 'Сохранить в сохраненки'}
                      className={`save-work-btn ${savedRecommendationIds.includes(item.id) ? 'save-work-btn-active' : ''}`}
                      onClick={() => toggleSavedRecommendation(item.id)}
                    >
                      <span className="save-work-icon save-work-icon-default" aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H11l2 2h4.5A2.5 2.5 0 0 1 20 9.5v7a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
                        </svg>
                      </span>
                      <span className="save-work-icon save-work-icon-check" aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <path d="m5 12 4.2 4.2L19 7.8" />
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
