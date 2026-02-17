'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthModal from './AuthModal';

export default function Header() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <header className="w-full">
        <div className="mx-auto flex w-full max-w-[1840px] items-center gap-6 px-10 py-5">
          <div className="flex items-center gap-8">
            <div className="text-xl font-bold tracking-tight text-white">Название</div>
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
                className="w-full rounded-full bg-white/90 px-10 py-2 text-sm text-black placeholder:text-black outline-none shadow-soft font-semibold border-2"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="h-9 rounded-full bg-white/90 px-5 text-sm font-medium text-black shadow-soft hover:bg-white transition-colors cursor-pointer"
            >
              Авторизация
            </button>

            <button
              type="button"
              aria-label="Профиль пользователя"
              className="h-10 w-10 overflow-hidden rounded-full border border-white/50 bg-white/90 shadow-soft"
            >
              <img
                src="https://i.pinimg.com/1200x/3c/c2/4e/3cc24e5ebc49c6700e848adc51158efd.jpg"
                alt="Аватар пользователя"
                className="h-full w-full object-cover cursor-pointer"
              />
            </button>

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
