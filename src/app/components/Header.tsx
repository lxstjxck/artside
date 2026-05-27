'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AuthModal from './AuthModal';
import type { AuthUser, UserProfile } from '@/lib/auth-types';

type HeaderNotification = {
  id: number;
  text: string;
  type: string;
  href: string | null;
  unread: boolean;
  createdAt: string;
};

type SearchItem = {
  id: number;
  title: string;
  category: string;
  author: string;
  authorUsername: string;
  imageUrl: string;
};

type SearchFilters = {
  categories: Array<{ name: string; count: number }>;
  tags: Array<{ name: string; count: number }>;
  authors: Array<{ username: string; name: string; count: number }>;
};

type SearchResponse = {
  items?: SearchItem[];
  filters?: SearchFilters;
};

const RECENT_SEARCHES_KEY = 'artside_recent_searches';

export default function Header() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const [infoModal, setInfoModal] = useState<'about' | 'rules' | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchItems, setSearchItems] = useState<SearchItem[]>([]);
  const [discoveryItems, setDiscoveryItems] = useState<SearchItem[]>([]);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({ categories: [], tags: [], authors: [] });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const profileUsername = currentUser?.username ?? 'Название_user';
  const profileHref = `/profile/${profileUsername}`;
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const profileMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const notificationsContainerRef = useRef<HTMLDivElement | null>(null);
  const notificationsButtonRef = useRef<HTMLButtonElement | null>(null);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const moreMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const isProfilePage = pathname.startsWith('/profile/');
  const isLibraryPage = pathname.startsWith('/library');
  const isSettingsPage = pathname.startsWith('/settings');
  const isPublishPage = pathname.startsWith('/publish');
  const hasUnreadNotifications = notifications.some((item) => item.unread);
  const isAuthenticated = Boolean(currentUser);

  const markNotificationsAsRead = async () => {
    const response = await fetch('/api/notifications/read-all', { method: 'POST' });
    if (!response.ok) return;
    const data = (await response.json()) as { notifications?: HeaderNotification[] };
    if (Array.isArray(data.notifications)) {
      setNotifications(data.notifications);
    }
  };

  const toggleNotificationsMenu = () => {
    setIsNotificationsOpen((current) => {
      const next = !current;
      if (next) {
        void markNotificationsAsRead();
      }
      return next;
    });
  };

  const openAuth = (mode: 'login' | 'register') => {
    setAuthInitialMode(mode);
    setIsAuthModalOpen(true);
    setIsMoreMenuOpen(false);
  };

  const openPublishWork = () => {
    if (!currentUser) return;
    window.location.href = '/publish';
  };

  useEffect(() => {
    if (!isProfileMenuOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      const inPanel = profileMenuRef.current?.contains(target);
      const inButton = profileMenuButtonRef.current?.contains(target);

      if (!inPanel && !inButton) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isProfileMenuOpen]);

  useEffect(() => {
    if (!isNotificationsOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      const inPanel = notificationsContainerRef.current?.contains(target);
      const inButton = notificationsButtonRef.current?.contains(target);

      if (!inPanel && !inButton) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isNotificationsOpen]);

  useEffect(() => {
    if (!isMoreMenuOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      const inPanel = moreMenuRef.current?.contains(target);
      const inButton = moreMenuButtonRef.current?.contains(target);

      if (!inPanel && !inButton) {
        setIsMoreMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isMoreMenuOpen]);

  useEffect(() => {
    if (!isSearchOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!searchContainerRef.current?.contains(target)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isSearchOpen]);

  useEffect(() => {
    const controller = new AbortController();

    const loadSession = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!response.ok) return;

        const data = (await response.json()) as { authenticated: boolean; user?: AuthUser; profile?: UserProfile };
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
          setAvatarUrl(data.profile?.avatarUrl || null);
        } else {
          setCurrentUser(null);
          setAvatarUrl(null);
        }
      } catch {
        setCurrentUser(null);
      } finally {
        if (!controller.signal.aborted) {
          setIsSessionLoading(false);
        }
      }
    };

    void loadSession();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    const controller = new AbortController();

    const loadNotifications = async () => {
      try {
        const response = await fetch('/api/notifications', {
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!response.ok) return;

        const data = (await response.json()) as {
          authenticated: boolean;
          notifications?: HeaderNotification[];
        };

        if (data.authenticated && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        }
      } catch {
        setNotifications([]);
      }
    };

    void loadNotifications();

    return () => controller.abort();
  }, [currentUser]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('resetToken');
    if (token) {
      setResetToken(token);
      setIsAuthModalOpen(true);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_KEY) ?? '[]') as unknown;
      setRecentSearches(Array.isArray(stored) ? stored.filter((item): item is string => typeof item === 'string').slice(0, 8) : []);
    } catch {
      setRecentSearches([]);
    }
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchItems([]);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      const loadSearch = async () => {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) return;
        const data = (await response.json()) as SearchResponse;
        setSearchItems(data.items ?? []);
        setSearchFilters(data.filters ?? { categories: [], tags: [], authors: [] });
        setIsSearchOpen(true);
      };

      void loadSearch();
    }, 220);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [searchQuery]);

  useEffect(() => {
    if (!isSearchOpen || searchQuery.trim().length >= 2 || discoveryItems.length > 0) return;

    const controller = new AbortController();
    const loadDiscovery = async () => {
      const response = await fetch('/api/search?sort=popular', {
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!response.ok) return;
      const data = (await response.json()) as SearchResponse;
      setDiscoveryItems(data.items ?? []);
      setSearchFilters(data.filters ?? { categories: [], tags: [], authors: [] });
    };

    void loadDiscovery();
    return () => controller.abort();
  }, [discoveryItems.length, isSearchOpen, searchQuery]);

  const saveRecentSearch = (value: string) => {
    const query = value.trim();
    if (query.length < 2) return;
    const next = [query, ...recentSearches.filter((item) => item.toLowerCase() !== query.toLowerCase())].slice(0, 8);
    setRecentSearches(next);
    try {
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    } catch {
      // Local storage can be unavailable in restricted browser modes.
    }
  };

  const runSearchSuggestion = (value: string) => {
    const query = value.trim();
    if (query.length < 2) return;
    saveRecentSearch(query);
    setSearchQuery(query);
    setIsSearchOpen(false);

    const href = `/?q=${encodeURIComponent(query)}`;
    if (window.location.pathname === '/') {
      window.history.pushState(null, '', href);
      window.dispatchEvent(new Event('artside:search-change'));
      return;
    }

    window.location.href = href;
  };

  const searchSuggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query.length < 2) return [];
    const raw = [
      ...searchItems.map((item) => item.title),
      ...searchItems.map((item) => item.category),
      ...searchItems.map((item) => item.author),
      ...searchFilters.tags.map((item) => item.name),
      ...searchFilters.categories.map((item) => item.name),
      ...searchFilters.authors.map((item) => item.name),
    ];
    return Array.from(new Set(raw.filter((item) => item.toLowerCase().includes(query)))).slice(0, 10);
  }, [searchFilters, searchItems, searchQuery]);

  return (
    <>
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          resetToken={resetToken}
          initialMode={resetToken ? 'reset' : authInitialMode}
          onClose={() => {
            setIsAuthModalOpen(false);
            if (resetToken) {
              setResetToken(null);
              window.history.replaceState(null, '', window.location.pathname);
            }
          }}
        onSuccess={(user) => {
          setCurrentUser(user);
          setAvatarUrl(null);
            setIsProfileMenuOpen(false);
            setIsNotificationsOpen(false);
          }}
        />
      )}
      {infoModal && (
        <div className="settings-modal-overlay" onClick={() => setInfoModal(null)}>
          <section className="info-modal" onClick={(event) => event.stopPropagation()}>
            <header className="settings-modal-head">
              <div>
                <h2>{infoModal === 'about' ? 'О проекте' : 'Правила сообщества'}</h2>
                <p>Название</p>
              </div>
              <button type="button" onClick={() => setInfoModal(null)} aria-label="Закрыть">
                x
              </button>
            </header>
            {infoModal === 'about' ? (
              <div className="info-modal-content">
                <p>Название - платформа для публикации, поиска и сохранения визуальных работ.</p>
                <p>Здесь можно вести профиль автора, загружать работы, получать реакции, комментарии и попадать в рекомендации.</p>
              </div>
            ) : (
              <div className="info-modal-content">
                <p>Публикуйте только свои работы или материалы, на которые у вас есть права.</p>
                <p>Не размещайте спам, оскорбления, чужие персональные данные и контент, нарушающий закон.</p>
                <p>Комментарии должны относиться к работе и не мешать другим пользователям пользоваться платформой.</p>
              </div>
            )}
          </section>
        </div>
      )}
      <header className={`site-header w-full ${(isProfilePage || isLibraryPage || isSettingsPage || isPublishPage) ? 'border-b border-white/15' : ''}`}>
        <div className="flex w-full items-center gap-6 px-10 py-5">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-2xl font-bold tracking-tight text-white">
              Название
            </Link>
          </div>

          <div className="flex-1">
            <div ref={searchContainerRef} className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    runSearchSuggestion(searchQuery);
                  }
                }}
                onFocus={() => {
                  setIsSearchOpen(true);
                }}
                className="w-full rounded-full bg-white/90 px-10 py-2 text-sm text-black placeholder:text-grey outline-none shadow-soft font-semibold border-2"
              />
              {isSearchOpen && (
                <div className="search-results-panel">
                  {searchQuery.trim().length < 2 ? (
                    <div className="search-discovery">
                      {recentSearches.length > 0 && (
                        <section>
                          <h2>Недавние поисковые запросы</h2>
                          <div className="search-discovery-grid">
                            {recentSearches.map((item, index) => {
                              const thumb = discoveryItems[index % Math.max(1, discoveryItems.length)];
                              return (
                                <button key={item} type="button" className="search-discovery-card" onClick={() => runSearchSuggestion(item)}>
                                  {thumb && <span style={{ backgroundImage: `url(${thumb.imageUrl})` }} />}
                                  <strong>{item}</strong>
                                </button>
                              );
                            })}
                          </div>
                        </section>
                      )}
                      <section>
                        <h2>Идеи для вас</h2>
                        <div className="search-discovery-grid">
                          {[...searchFilters.categories.slice(0, 4).map((item) => item.name), ...searchFilters.tags.slice(0, 4).map((item) => item.name)].map((item, index) => {
                            const thumb = discoveryItems[(index + 2) % Math.max(1, discoveryItems.length)];
                            return (
                              <button key={item} type="button" className="search-discovery-card" onClick={() => runSearchSuggestion(item)}>
                                {thumb && <span style={{ backgroundImage: `url(${thumb.imageUrl})` }} />}
                                <strong>{item}</strong>
                              </button>
                            );
                          })}
                        </div>
                      </section>
                      {discoveryItems.length > 0 && (
                        <section>
                          <h2>Популярно</h2>
                          <div className="search-popular-row">
                            {discoveryItems.slice(0, 6).map((item) => (
                              <Link key={item.id} href={`/work/${item.id}`} onClick={() => setIsSearchOpen(false)}>
                                <span style={{ backgroundImage: `url(${item.imageUrl})` }} />
                                <strong>{item.title}</strong>
                              </Link>
                            ))}
                          </div>
                        </section>
                      )}
                    </div>
                  ) : searchSuggestions.length === 0 && searchItems.length === 0 ? (
                    <p className="search-results-empty">Ничего не найдено</p>
                  ) : (
                    <div className="search-suggest-panel">
                      <div className="search-query-suggestions">
                        {searchSuggestions.map((item) => (
                          <button key={item} type="button" onClick={() => runSearchSuggestion(item)}>
                            <span aria-hidden="true">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="7" />
                                <path d="m20 20-3.5-3.5" />
                              </svg>
                            </span>
                            {item}
                          </button>
                        ))}
                      </div>
                      {searchItems.length > 0 && (
                        <div className="search-result-grid-menu">
                          {searchItems.slice(0, 8).map((item) => (
                            <Link
                              key={item.id}
                              href={`/work/${item.id}`}
                              className="search-result-item"
                              onClick={() => {
                                saveRecentSearch(searchQuery);
                                setIsSearchOpen(false);
                                setSearchQuery('');
                              }}
                            >
                              <span className="search-result-thumb" style={{ backgroundImage: `url(${item.imageUrl})` }} />
                              <span>
                                <strong>{item.title}</strong>
                                <small>{item.category} · {item.author}</small>
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="relative flex items-center gap-4">
            {!isAuthenticated && !isSessionLoading && (
              <button
                type="button"
                onClick={() => openAuth('login')}
                className="h-9 rounded-full bg-white/90 px-5 text-sm font-bold text-black shadow-soft hover:bg-white transition-colors cursor-pointer"
              >
                Авторизация
              </button>
            )}

            {isAuthenticated && (
              <>
                <div className="relative">
                  <button
                    ref={notificationsButtonRef}
                    type="button"
                    aria-label="Уведомления"
                    aria-expanded={isNotificationsOpen}
                    onClick={toggleNotificationsMenu}
                    className="notification-trigger flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/16"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M15 18H5l1.2-1.2A2 2 0 0 0 7 15.4V11a5 5 0 1 1 10 0v4.4a2 2 0 0 0 .8 1.6L19 18h-4" />
                      <path d="M10 20a2 2 0 0 0 4 0" />
                    </svg>
                    {hasUnreadNotifications && <span className="notification-badge" />}
                  </button>

                  <div
                    ref={notificationsContainerRef}
                    className={`more-menu ${isNotificationsOpen ? 'more-menu-open' : ''} absolute right-0 top-full z-[70] flex w-72 origin-top-right flex-col gap-1 rounded-2xl border border-white/15 bg-[#121212]/96 p-2 shadow-2xl backdrop-blur transition-all duration-150 ${
                      isNotificationsOpen
                        ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
                        : 'pointer-events-none -translate-y-1 scale-95 opacity-0'
                    }`}
                  >
                    <div className="more-menu-head">
                      <span>Уведомления</span>
                      <small>{notifications.length > 0 ? `${notifications.length} последних событий` : 'Событий пока нет'}</small>
                    </div>
                    <div className="more-menu-section">
                      {notifications.length === 0 ? (
                        <p className="more-menu-empty">Пока нет новых уведомлений.</p>
                      ) : (
                        notifications.map((item) => {
                          const content = (
                            <>
                              <span className="notification-menu-text">{item.text}</span>
                              <span className="notification-menu-time">{item.createdAt}</span>
                            </>
                          );

                          return item.href ? (
                            <Link
                              key={item.id}
                              href={item.href}
                              onClick={() => setIsNotificationsOpen(false)}
                              className="notification-menu-item"
                            >
                              {content}
                            </Link>
                          ) : (
                            <button
                              key={item.id}
                              type="button"
                              className="notification-menu-item"
                            >
                              {content}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openPublishWork}
                  className="header-upload-btn"
                >
                  <span aria-hidden="true">+</span>
                  Загрузить
                </button>

                <div className="relative">
                  <button
                    ref={profileMenuButtonRef}
                    type="button"
                    aria-label="Профиль пользователя"
                    aria-expanded={isProfileMenuOpen}
                    onClick={() => setIsProfileMenuOpen((current) => !current)}
                    className="avatar-trigger flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/50 bg-white/90 text-black shadow-soft cursor-pointer"
                  >
                    {avatarUrl ? (
                      <span className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${avatarUrl})` }} />
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
                      </svg>
                    )}
                  </button>

                  <div
                    ref={profileMenuRef}
                    className={`more-menu ${isProfileMenuOpen ? 'more-menu-open' : ''} absolute right-0 top-full z-[70] flex w-60 origin-top-right flex-col gap-1 rounded-2xl border border-white/15 bg-[#121212]/96 p-2 shadow-2xl backdrop-blur transition-all duration-150 ${
                      isProfileMenuOpen
                        ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
                        : 'pointer-events-none -translate-y-1 scale-95 opacity-0'
                    }`}
                  >
                    <div className="more-menu-head">
                      <span>Профиль</span>
                      <small>@{profileUsername}</small>
                    </div>

                    <div className="more-menu-section">
                    <Link
                      href={profileHref}
                      className=""
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <span className="more-menu-icon">P</span>
                      <span>Мой профиль</span>
                    </Link>
                    <Link
                      href="/library"
                      className=""
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <span className="more-menu-icon">□</span>
                      <span>Моя библиотека</span>
                    </Link>
                    <Link href="/settings" onClick={() => setIsProfileMenuOpen(false)}>
                      <span className="more-menu-icon">⚙</span>
                      <span>Настройки аккаунта</span>
                    </Link>
                    </div>

                    <div className="more-menu-section">
                    <button
                      type="button"
                      onClick={() => {
                        const logout = async () => {
                          try {
                            await fetch('/api/auth/logout', { method: 'POST' });
                          } finally {
                            setCurrentUser(null);
                            setIsProfileMenuOpen(false);
                            setIsNotificationsOpen(false);
                          }
                        };

                        void logout();
                      }}
                      className="more-menu-danger"
                    >
                      <span className="more-menu-icon">→</span>
                      <span>Выйти</span>
                    </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="relative">
              <button
                ref={moreMenuButtonRef}
                type="button"
                aria-label="Меню"
                aria-expanded={isMoreMenuOpen}
                onClick={() => setIsMoreMenuOpen((current) => !current)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>

              <div
                ref={moreMenuRef}
                className={`more-menu ${isMoreMenuOpen ? 'more-menu-open' : ''} absolute right-0 top-full z-[70] flex w-60 origin-top-right flex-col gap-1 rounded-2xl border border-white/15 bg-[#121212]/96 p-2 shadow-2xl backdrop-blur transition-all duration-150 ${
                  isMoreMenuOpen
                    ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
                    : 'pointer-events-none -translate-y-1 scale-95 opacity-0'
                }`}
              >
                {isAuthenticated && currentUser ? (
                  <>
                    

                      <span className="more-menu-label">Информация</span>
                      <button type="button" onClick={() => { setInfoModal('rules'); setIsMoreMenuOpen(false); }}>
                        <span className="more-menu-icon">!</span>
                        <span>Правила сообщества</span>
                      </button>
                      <button type="button" onClick={() => { setInfoModal('about'); setIsMoreMenuOpen(false); }}>
                        <span className="more-menu-icon">i</span>
                        <span>О проекте</span>
                      </button>
                  </>
                ) : (
                  <>
                    <div className="more-menu-head">
                      <span>Название</span>
                      <small>Войдите, чтобы публиковать работы</small>
                    </div>

                    <div className="more-menu-section">
                      <span className="more-menu-label">Аккаунт</span>
                      <button type="button" onClick={() => openAuth('login')}>
                        <span className="more-menu-icon">→</span>
                        <span>Войти</span>
                      </button>
                      <button type="button" onClick={() => openAuth('register')}>
                        <span className="more-menu-icon">+</span>
                        <span>Регистрация</span>
                      </button>
                    </div>

                    <div className="more-menu-section">
                      <span className="more-menu-label">Информация</span>
                      <button type="button" onClick={() => { setInfoModal('about'); setIsMoreMenuOpen(false); }}>
                        <span className="more-menu-icon">i</span>
                        <span>О проекте</span>
                      </button>
                      <button type="button" onClick={() => { setInfoModal('rules'); setIsMoreMenuOpen(false); }}>
                        <span className="more-menu-icon">!</span>
                        <span>Правила сообщества</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
