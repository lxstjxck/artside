'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { HomeFeedResponse, WorkSummary } from '@/lib/home-feed';
import type { LibraryFolderItem, SavedWorkItem } from '@/lib/saved-work-types';

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

  const [saveTarget, setSaveTarget] = useState<WorkSummary | null>(null);
  const [libraryFolders, setLibraryFolders] = useState<LibraryFolderItem[]>([]);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [collectionSearch, setCollectionSearch] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);

  const [popularCanScrollLeft, setPopularCanScrollLeft] = useState(false);
  const [popularCanScrollRight, setPopularCanScrollRight] = useState(false);

  const popularRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const applySavedItems = (items: SavedWorkItem[]) => {
    setSavedWorkIds(items.map((item) => item.id));
  };

  const updatePopularScrollState = () => {
    const track = popularRef.current;
    if (!track) {
      setPopularCanScrollLeft(false);
      setPopularCanScrollRight(false);
      return;
    }

    const maxScrollLeft = Math.max(0, track.scrollWidth - track.clientWidth);
    setPopularCanScrollLeft(track.scrollLeft > 2);
    setPopularCanScrollRight(track.scrollLeft < maxScrollLeft - 2);
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
    const timeoutId = window.setTimeout(() => setToastMessage(null), 2800);
    return () => window.clearTimeout(timeoutId);
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

  useEffect(() => {
    const track = popularRef.current;
    if (!track) return;

    updatePopularScrollState();
    const handleScroll = () => updatePopularScrollState();
    const handleResize = () => updatePopularScrollState();

    track.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      track.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [popularItems.length, isFeedLoading]);

  const toggleCategory = (category: string) => {
    setActiveCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  };

  const loadLibraryFolders = async () => {
    setIsLibraryLoading(true);
    setSavedError(null);

    try {
      const response = await fetch('/api/library', { cache: 'no-store' });
      const data = (await response.json()) as { authenticated: boolean; folders?: LibraryFolderItem[] };

      if (!data.authenticated) {
        setIsAuthenticated(false);
        setSaveTarget(null);
        setToastMessage('Войдите в аккаунт, чтобы сохранять работы.');
        return;
      }

      setLibraryFolders(data.folders ?? []);
    } catch {
      setSavedError('Не удалось загрузить папки библиотеки.');
    } finally {
      setIsLibraryLoading(false);
    }
  };

  const openSaveModal = (work: WorkSummary) => {
    if (!isAuthenticated) {
      setToastMessage('Войдите в аккаунт, чтобы сохранять работы.');
      return;
    }

    setSaveTarget(work);
    setCollectionSearch('');
    setNewCollectionName('');
    void loadLibraryFolders();
  };

  const closeSaveModal = () => {
    setSaveTarget(null);
    setCollectionSearch('');
    setNewCollectionName('');
    setIsCreatingCollection(false);
  };

  const saveWorkToFolder = async (id: number, folderId: number) => {
    if (pendingSavedIds.includes(id)) return;

    setSavedError(null);
    setPendingSavedIds((current) => [...current, id]);

    try {
      const response = await fetch('/api/saved-works', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, folderId }),
      });

      const data = (await response.json()) as { message?: string; items?: SavedWorkItem[] };

      if (!response.ok || !data.items) {
        if (response.status === 401) {
          setIsAuthenticated(false);
          setSavedWorkIds([]);
        }
        throw new Error(data.message ?? 'Не удалось сохранить работу.');
      }

      applySavedItems(data.items);
      closeSaveModal();
      setToastMessage('Работа сохранена в библиотеку.');
    } catch (error) {
      setToastMessage((error as Error).message || 'Не удалось сохранить работу.');
    } finally {
      setPendingSavedIds((current) => current.filter((item) => item !== id));
    }
  };

  const createCollection = async () => {
    if (!newCollectionName.trim() || isCreatingCollection) return;

    setIsCreatingCollection(true);
    setSavedError(null);

    try {
      const response = await fetch('/api/library/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCollectionName }),
      });
      const data = (await response.json()) as { folders?: LibraryFolderItem[]; message?: string };

      if (!response.ok || !data.folders) {
        throw new Error(data.message ?? 'Не удалось создать папку.');
      }

      setLibraryFolders(data.folders);
      setCollectionSearch('');
      setNewCollectionName('');
    } catch (error) {
      setSavedError((error as Error).message);
    } finally {
      setIsCreatingCollection(false);
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
    const nextScrollLeft = Math.min(maxScrollLeft, Math.max(0, track.scrollLeft + dir * amount));

    track.scrollTo({ left: nextScrollLeft, behavior: 'smooth' });
    window.setTimeout(updatePopularScrollState, 260);
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
        aria-label={isSaved ? 'Работа уже сохранена' : 'Сохранить работу в библиотеку'}
        className={`save-work-btn ${isSaved ? 'save-work-btn-active' : ''}`}
        onClick={(event) => {
          event.stopPropagation();
          openSaveModal(item);
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

  const filteredFolders = libraryFolders.filter((folder) =>
    folder.name.toLowerCase().includes(collectionSearch.trim().toLowerCase())
  );

  return (
    <main>
      <section className="pb-1">
        <div className="flex w-full flex-wrap items-center justify-between gap-4 px-10 pb-4">
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
        <div className="home-section-block w-full px-10">
          <h2 className="section-title">Популярное</h2>
          {feedError && <p className="modern-alert mb-3">{feedError}</p>}
          {savedError && !saveTarget && <p className="modern-alert mb-3">{savedError}</p>}
          <div className="home-section-content relative">
            <button
              className="nav-arrow nav-arrow-left"
              onClick={() => scrollPopular(-1)}
              aria-label="Назад"
              type="button"
              disabled={!popularCanScrollLeft}
            >
              ‹
            </button>
            <button
              className="nav-arrow nav-arrow-right"
              onClick={() => scrollPopular(1)}
              aria-label="Вперед"
              type="button"
              disabled={!popularCanScrollRight}
            >
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

        <div className="home-section-block w-full px-10 pb-12">
          <h2 className="section-title">Рекомендации для вас</h2>
          {isSavedLoading && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/6 px-3 py-1 text-xs text-white/70">
              <span className="modern-spinner" />
              Синхронизация сохранений...
            </div>
          )}
          <div className="home-section-content recommend-masonry">
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

      {saveTarget && (
        <div className="collection-modal-overlay" onClick={closeSaveModal}>
          <div className="collection-modal" onClick={(event) => event.stopPropagation()}>
            <div className="collection-modal-head">
              <h2>Добавить работу в коллекцию</h2>
              <button type="button" onClick={closeSaveModal} aria-label="Закрыть">
                ×
              </button>
            </div>

            <div className="collection-create-row">
              <input
                value={newCollectionName}
                onChange={(event) => setNewCollectionName(event.target.value)}
                placeholder="Название новой папки"
                maxLength={40}
              />
              <button type="button" onClick={createCollection} disabled={isCreatingCollection || !newCollectionName.trim()}>
                <span aria-hidden="true">+</span>
                Создать
              </button>
            </div>

            <label className="collection-search">
              <span aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m21 21-4.3-4.3" />
                  <circle cx="11" cy="11" r="7" />
                </svg>
              </span>
              <input
                value={collectionSearch}
                onChange={(event) => setCollectionSearch(event.target.value)}
                placeholder="Поиск папок..."
              />
            </label>

            {savedError && <p className="collection-modal-error">{savedError}</p>}

            <div className="collection-list">
              {isLibraryLoading ? (
                <p className="collection-empty">Загрузка папок...</p>
              ) : filteredFolders.length === 0 ? (
                <p className="collection-empty">Папок пока нет. Создайте новую выше.</p>
              ) : (
                filteredFolders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => void saveWorkToFolder(saveTarget.id, folder.id)}
                    disabled={pendingSavedIds.includes(saveTarget.id)}
                  >
                    <span className="collection-folder-icon" aria-hidden="true" />
                    <span>
                      <strong>{folder.name}</strong>
                      <small>{folder.count} работ</small>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
