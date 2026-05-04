'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { HomeFeedResponse, WorkSummary } from '@/lib/home-feed';
import type { SavedWorkItem } from '@/lib/saved-work-types';

export default function Home() {
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [feed, setFeed] = useState<HomeFeedResponse | null>(null);
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [savedWorkIds, setSavedWorkIds] = useState<number[]>([]);
  const [isSavedLoading, setIsSavedLoading] = useState(true);
  const [savedError, setSavedError] = useState<string | null>(null);
  const [pendingSavedIds, setPendingSavedIds] = useState<number[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const popularRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const applySavedItems = (items: SavedWorkItem[]) => {
    setSavedWorkIds(items.map((item) => item.id));
  };

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

    void loadFeed();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timeoutId = setTimeout(() => setToastMessage(null), 2800);
    return () => clearTimeout(timeoutId);
  }, [toastMessage]);

  useEffect(() => {
    const controller = new AbortController();

    const loadSavedWorks = async () => {
      try {
        const response = await fetch('/api/saved-works', {
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Saved works request failed: ${response.status}`);
        }

        const data = (await response.json()) as { authenticated: boolean; items: SavedWorkItem[] };
        setIsAuthenticated(data.authenticated);
        applySavedItems(data.items ?? []);
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
  }, []);

  const categories = feed?.categories ?? [];
  const popularItems = feed?.popular ?? [];
  const recommendedItems = useMemo(() => {
    const items = feed?.recommendations ?? [];
    if (activeCategories.length === 0) return items;
    return items.filter((item) => activeCategories.includes(item.category));
  }, [activeCategories, feed]);

  const toggleCategory = (category: string) => {
    setActiveCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  };

  const toggleSavedWork = async (id: number) => {
    if (!isAuthenticated) {
      setToastMessage('Войдите в аккаунт, чтобы сохранять работы.');
      return;
    }

    if (pendingSavedIds.includes(id)) return;

    const isSaved = savedWorkIds.includes(id);
    setSavedError(null);
    setPendingSavedIds((current) => [...current, id]);

    try {
      const response = isSaved
        ? await fetch(`/api/saved-works/${id}`, { method: 'DELETE' })
        : await fetch('/api/saved-works', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id }),
          });

      const data = (await response.json()) as { message?: string; items?: SavedWorkItem[] };

      if (!response.ok || !data.items) {
        if (response.status === 401) {
          setIsAuthenticated(false);
          setSavedWorkIds([]);
        }
        throw new Error(data.message ?? 'Не удалось обновить сохранения.');
      }

      applySavedItems(data.items);
    } catch (error) {
      setToastMessage((error as Error).message || 'Не удалось обновить сохранения.');
    } finally {
      setPendingSavedIds((current) => current.filter((item) => item !== id));
    }
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

  const openWork = (id: number) => {
    router.push(`/work/${id}`);
  };

  const renderSaveButton = (item: WorkSummary) => {
    const isSaved = savedWorkIds.includes(item.id);
    const isPending = pendingSavedIds.includes(item.id);

    return (
      <button
        type="button"
        aria-label={isSaved ? 'Убрать работу из сохраненок' : 'Сохранить работу в профиль'}
        className={`save-work-btn ${isSaved ? 'save-work-btn-active' : ''}`}
        onClick={(event) => {
          event.stopPropagation();
          void toggleSavedWork(item.id);
        }}
        disabled={isPending}
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
    );
  };

  return (
    <main>
      <section className="pb-6">
        <div className="flex w-full flex-wrap items-center justify-between gap-4 px-10 pb-6">
          <div className="flex items-center gap-3">
            <button className="chip chip-dark" type="button">Отслеживаемое</button>
            <button className="chip chip-dark" type="button">Понравившееся</button>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {activeCategories.length > 0 && (
              <button
                className="clear-categories-btn"
                onClick={() => setActiveCategories([])}
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
          {feedError && <p className="modern-alert mb-3">{feedError}</p>}
          {savedError && <p className="modern-alert mb-3">{savedError}</p>}
          <div className="relative">
            <button className="nav-arrow nav-arrow-left" onClick={() => scrollPopular(-1)} aria-label="Назад" type="button">
              ‹
            </button>
            <button className="nav-arrow nav-arrow-right" onClick={() => scrollPopular(1)} aria-label="Вперед" type="button">
              ›
            </button>

            <div ref={popularRef} className="popular-track">
              {isFeedLoading && popularItems.length === 0 && (
                Array.from({ length: 5 }, (_, index) => (
                  <div key={`popular-loading-${index}`} className="popular-card snap-start">
                    <div className="popular-thumb modern-skeleton" />
                    <div className="popular-meta">
                      <span className="modern-skeleton modern-skeleton-text" />
                      <span className="popular-dot modern-skeleton" />
                    </div>
                  </div>
                ))
              )}
              {popularItems.map((item) => (
                <div
                  key={item.id}
                  className="popular-card snap-start cursor-pointer"
                  onClick={() => openWork(item.id)}
                >
                  <div className="popular-thumb">
                    <Image src={item.imageUrl} alt={item.title} width={item.imageWidth ?? 1200} height={item.imageHeight ?? 1500} unoptimized />
                    <div className="popular-overlay">
                      {renderSaveButton(item)}
                    </div>
                  </div>
                  <div className="popular-meta">
                    <span className="popular-title">{item.title}</span>
                    <span className="popular-author">{item.author}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="section-divider" />

        <div className="w-full px-10 pb-12">
          <h2 className="section-title">Рекомендации для вас</h2>
          {isSavedLoading && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/6 px-3 py-1 text-xs text-white/70">
              <span className="modern-spinner" />
              Синхронизация сохранений...
            </div>
          )}
          <div className="recommend-masonry">
            {isFeedLoading && recommendedItems.length === 0 && (
              Array.from({ length: 10 }, (_, index) => (
                <article key={`recommend-loading-${index}`} className="recommend-card">
                  <div className="recommend-card-media modern-skeleton" />
                </article>
              ))
            )}
            {!isFeedLoading && recommendedItems.length === 0 && (
              <p className="text-sm text-white/70">В выбранных категориях пока нет работ.</p>
            )}
            {recommendedItems.map((item) => (
              <article
                key={item.id}
                className="recommend-card cursor-pointer"
                onClick={() => openWork(item.id)}
              >
                <div className="recommend-card-media">
                  <Image src={item.imageUrl} alt={item.title} width={item.imageWidth ?? 1200} height={item.imageHeight ?? 1500} unoptimized />
                  <div className="recommend-card-overlay">
                    {renderSaveButton(item)}
                  </div>
                </div>
                <div className="recommend-card-info">
                  <p>{item.title}</p>
                  <span>{item.category}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {toastMessage && (
        <div className="modern-toast" role="status" aria-live="polite">
          <span className="modern-toast-dot" />
          {toastMessage}
        </div>
      )}
    </main>
  );
}
