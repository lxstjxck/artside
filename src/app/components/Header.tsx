'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import AuthModal from './AuthModal';

export default function Header() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [avatarUrl] = useState<string | null>(null);
  const profileUsername = 'artside_user';
  const profileHref = `/profile/${profileUsername}`;
  const profileMenuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  return (
    <>
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={() => {
            setIsAuthenticated(true);
            setIsProfileMenuOpen(false);
          }}
        />
      )}
      <header className="w-full">
        <div className="mx-auto flex w-full max-w-[1840px] items-center gap-6 px-10 py-5">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold tracking-tight text-white">
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
            {!isAuthenticated && (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="h-9 rounded-full bg-white/90 px-5 text-sm font-medium text-black shadow-soft hover:bg-white transition-colors cursor-pointer"
              >
                Авторизация
              </button>
            )}

            {isAuthenticated && (
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
                      setIsAuthenticated(false);
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-white/10"
                  >
                    Выйти
                  </button>
                </div>
              </div>
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
