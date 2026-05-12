'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AccountSettingsModal from './AccountSettingsModal';
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
  imageUrl: string;
};

export default function Header() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<'about' | 'rules' | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchItems, setSearchItems] = useState<SearchItem[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const profileUsername = currentUser?.username ?? 'Название_user';
  const profileHref = `/profile/${profileUsername}`;
  const profileMenuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notificationsMenuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moreMenuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notificationsContainerRef = useRef<HTMLDivElement | null>(null);
  const notificationsButtonRef = useRef<HTMLButtonElement | null>(null);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const moreMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const pathname = usePathname();
  const isProfilePage = pathname.startsWith('/profile/');
  const hasUnreadNotifications = notifications.some((item) => item.unread);
  const isAuthenticated = Boolean(currentUser);

  const openProfileMenu = () => {
    if (profileMenuCloseTimer.current) {
      clearTimeout(profileMenuCloseTimer.current);
      profileMenuCloseTimer.current = null;
    }
    setIsProfileMenuOpen(true);
  };

  const closeProfileMenuWithDelay = () => {
    if (profileMenuCloseTimer.current) clearTimeout(profileMenuCloseTimer.current);
    profileMenuCloseTimer.current = setTimeout(() => {
      setIsProfileMenuOpen(false);
    }, 120);
  };

  const markNotificationsAsRead = async () => {
    const response = await fetch('/api/notifications/read-all', { method: 'POST' });
    if (!response.ok) return;
    const data = (await response.json()) as { notifications?: HeaderNotification[] };
    if (Array.isArray(data.notifications)) {
      setNotifications(data.notifications);
    }
  };

  const openNotificationsMenu = () => {
    if (notificationsMenuCloseTimer.current) {
      clearTimeout(notificationsMenuCloseTimer.current);
      notificationsMenuCloseTimer.current = null;
    }
    setIsNotificationsOpen((current) => {
      if (!current) {
        void markNotificationsAsRead();
      }
      return true;
    });
  };

  const closeNotificationsMenuWithDelay = () => {
    if (notificationsMenuCloseTimer.current) clearTimeout(notificationsMenuCloseTimer.current);
    notificationsMenuCloseTimer.current = setTimeout(() => {
      setIsNotificationsOpen(false);
    }, 140);
  };

  const openMoreMenu = () => {
    if (moreMenuCloseTimer.current) {
      clearTimeout(moreMenuCloseTimer.current);
      moreMenuCloseTimer.current = null;
    }
    setIsMoreMenuOpen(true);
  };

  const closeMoreMenuWithDelay = () => {
    if (moreMenuCloseTimer.current) clearTimeout(moreMenuCloseTimer.current);
    moreMenuCloseTimer.current = setTimeout(() => {
      setIsMoreMenuOpen(false);
    }, 140);
  };

  const openAuth = (mode: 'login' | 'register') => {
    setAuthInitialMode(mode);
    setIsAuthModalOpen(true);
    setIsMoreMenuOpen(false);
  };

  const openPublishWork = () => {
    if (!currentUser) return;

    if (isProfilePage && pathname === profileHref) {
      window.dispatchEvent(new CustomEvent('artside:open-publish-work'));
      return;
    }

    window.location.href = `${profileHref}?publish=1`;
  };

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
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchItems([]);
      setIsSearchOpen(false);
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
        const data = (await response.json()) as { items?: SearchItem[] };
        setSearchItems(data.items ?? []);
        setIsSearchOpen(true);
      };

      void loadSearch();
    }, 220);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [searchQuery]);

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
      {currentUser && (
        <AccountSettingsModal
          isOpen={isAccountSettingsOpen}
          user={currentUser}
          onClose={() => setIsAccountSettingsOpen(false)}
          onUserUpdate={setCurrentUser}
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
      <header className={`w-full ${isProfilePage ? 'border-b border-white/15 bg-[#111111]' : ''}`}>
        <div className="flex w-full items-center gap-6 px-10 py-5">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-2xl font-bold tracking-tight text-white">
              Название
            </Link>
          </div>

          <div className="flex-1">
            <div className="relative">
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
                onFocus={() => {
                  if (searchItems.length > 0) setIsSearchOpen(true);
                }}
                className="w-full rounded-full bg-white/90 px-10 py-2 text-sm text-black placeholder:text-grey outline-none shadow-soft font-semibold border-2"
              />
              {isSearchOpen && (
                <div className="search-results-panel">
                  {searchItems.length === 0 ? (
                    <p className="search-results-empty">Ничего не найдено</p>
                  ) : (
                    searchItems.map((item) => (
                      <Link
                        key={item.id}
                        href={`/work/${item.id}`}
                        className="search-result-item"
                        onClick={() => {
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
                    ))
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
                <div
                  className="relative"
                  onMouseEnter={openNotificationsMenu}
                  onMouseLeave={closeNotificationsMenuWithDelay}
                >
                  <button
                    ref={notificationsButtonRef}
                    type="button"
                    aria-label="Уведомления"
                    aria-expanded={isNotificationsOpen}
                    onClick={openNotificationsMenu}
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
                    onMouseEnter={openNotificationsMenu}
                    onMouseLeave={closeNotificationsMenuWithDelay}
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

                <div
                  className="relative"
                  onMouseEnter={openProfileMenu}
                  onMouseLeave={closeProfileMenuWithDelay}
                >
                  <Link
                    href={profileHref}
                    aria-label="Профиль пользователя"
                    className="avatar-trigger flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/50 bg-white/90 text-black shadow-soft cursor-pointer"
                  >
                    {avatarUrl ? (
                      <span className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${avatarUrl})` }} />
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
                      </svg>
                    )}
                  </Link>

                  <div
                    className={`more-menu ${isProfileMenuOpen ? 'more-menu-open' : ''} absolute right-0 top-full z-[70] flex w-60 origin-top-right flex-col gap-1 rounded-2xl border border-white/15 bg-[#121212]/96 p-2 shadow-2xl backdrop-blur transition-all duration-150 ${
                      isProfileMenuOpen
                        ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
                        : 'pointer-events-none -translate-y-1 scale-95 opacity-0'
                    }`}
                    onMouseEnter={openProfileMenu}
                    onMouseLeave={closeProfileMenuWithDelay}
                  >
                    <div className="more-menu-head">
                      <span>Профиль</span>
                      <small>@{profileUsername}</small>
                    </div>

                    <div className="more-menu-section">
                    <Link
                      href={profileHref}
                      className=""
                    >
                      <span className="more-menu-icon">P</span>
                      <span>Мой профиль</span>
                    </Link>
                    <Link
                      href="/library"
                      className=""
                    >
                      <span className="more-menu-icon">□</span>
                      <span>Моя библиотека</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountSettingsOpen(true);
                        setIsProfileMenuOpen(false);
                      }}
                    >
                      <span className="more-menu-icon">⚙</span>
                      <span>Настройки аккаунта</span>
                    </button>
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

            <div
              className="relative"
              onMouseEnter={openMoreMenu}
              onMouseLeave={closeMoreMenuWithDelay}
            >
              <button
                ref={moreMenuButtonRef}
                type="button"
                aria-label="Меню"
                aria-expanded={isMoreMenuOpen}
                onClick={openMoreMenu}
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
                onMouseEnter={openMoreMenu}
                onMouseLeave={closeMoreMenuWithDelay}
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
