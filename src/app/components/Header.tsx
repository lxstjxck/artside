'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AuthModal from './AuthModal';
import type { AuthUser } from '@/lib/auth-types';

type HeaderNotification = {
  id: number;
  text: string;
  unread: boolean;
};

const DEFAULT_NOTIFICATIONS: HeaderNotification[] = [
  { id: 1, text: 'Новый комментарий к вашей работе', unread: true },
  { id: 2, text: 'Пользователь added_you в подписках', unread: true },
  { id: 3, text: 'Подборка недели уже доступна', unread: true },
];

export default function Header() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<HeaderNotification[]>(DEFAULT_NOTIFICATIONS);
  const [avatarUrl] = useState<string | null>(null);
  const profileUsername = currentUser?.username ?? 'artside_user';
  const profileHref = `/profile/${profileUsername}`;
  const profileMenuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notificationsContainerRef = useRef<HTMLDivElement | null>(null);
  const notificationsButtonRef = useRef<HTMLButtonElement | null>(null);
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

  const toggleNotifications = () => {
    setIsNotificationsOpen((current) => {
      const next = !current;
      if (next) {
        const markNotificationsAsRead = async () => {
          const response = await fetch('/api/notifications/read-all', { method: 'POST' });
          if (!response.ok) return;
          const data = (await response.json()) as { notifications?: HeaderNotification[] };
          if (Array.isArray(data.notifications)) {
            setNotifications(data.notifications);
          }
        };

        void markNotificationsAsRead();
      }
      return next;
    });
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
    const controller = new AbortController();

    const loadSession = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!response.ok) return;

        const data = (await response.json()) as { authenticated: boolean; user?: AuthUser };
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
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
      setNotifications(DEFAULT_NOTIFICATIONS);
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
        setNotifications(DEFAULT_NOTIFICATIONS);
      }
    };

    void loadNotifications();

    return () => controller.abort();
  }, [currentUser]);

  return (
    <>
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={(user) => {
            setCurrentUser(user);
            setIsProfileMenuOpen(false);
            setIsNotificationsOpen(false);
          }}
        />
      )}
      <header className={`w-full ${isProfilePage ? 'border-b border-white/15 bg-[#111111]' : ''}`}>
        <div className="mx-auto flex w-full max-w-[1840px] items-center gap-6 px-10 py-5">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-2xl font-bold tracking-tight text-white">
              Artside
            </Link>
            <nav className="flex items-center gap-6 text-base font-medium">
              <Link href="/" className="text-white/80 hover:text-white transition-colors font-semibold">
                Общее
              </Link>
              <Link href="/" className="text-white/80 hover:text-white transition-colors font-semibold">
                Работа
              </Link>
            </nav>
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
                className="w-full rounded-full bg-white/90 px-10 py-2 text-sm text-black placeholder:text-grey outline-none shadow-soft font-semibold border-2"
              />
            </div>
          </div>

          <div className="relative flex items-center gap-4">
            {!isAuthenticated && !isSessionLoading && (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
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
                    onClick={toggleNotifications}
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
                    className={`absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-white/15 bg-[#121212]/96 p-2 shadow-2xl backdrop-blur transition-all duration-200 ease-out origin-top-right ${
                      isNotificationsOpen
                        ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
                        : 'pointer-events-none -translate-y-1 scale-95 opacity-0'
                    }`}
                  >
                    <div className="border-b border-white/10 px-3 py-2 text-sm font-semibold text-white">Уведомления</div>
                    <div className="p-1">
                      {notifications.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="block w-full border-b border-white/10 px-3 py-2 text-left text-sm text-white/80 transition-colors last:border-b-0 hover:bg-white/10 hover:text-white"
                        >
                          {item.text}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

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
                    className={`absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-white/20 bg-black/90 p-2 shadow-2xl backdrop-blur transition-all duration-200 ease-out origin-top-right ${
                      isProfileMenuOpen
                        ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
                        : 'pointer-events-none -translate-y-1 scale-95 opacity-0'
                    }`}
                    onMouseEnter={openProfileMenu}
                    onMouseLeave={closeProfileMenuWithDelay}
                  >
                    <Link
                      href={profileHref}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                    >
                      Профиль
                    </Link>
                    <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10">
                      Настройки
                    </button>
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
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-white/10"
                    >
                      Выйти
                    </button>
                  </div>
                </div>
              </>
            )}

            <button
              type="button"
              aria-label="Меню"
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
