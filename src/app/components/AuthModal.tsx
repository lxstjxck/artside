'use client';

import { useState } from 'react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-scale-in">
        <div className="w-full max-w-md bg-black border border-white/10 rounded-2xl p-8 relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors text-3xl"
          >
            ×
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-white mb-2">
              {isLogin ? 'Вход' : 'Регистрация'}
            </h2>
            <p className="text-white/60 text-sm">
              {isLogin
                ? 'Войдите в свой аккаунт ArtSide'
                : 'Создайте новый аккаунт ArtSide'}
            </p>
          </div>

          {/* Form */}
          <form className="space-y-4">
            {!isLogin && (
              <input
                type="text"
                placeholder="Имя пользователя"
                className="w-full rounded-lg bg-white/10 border border-white/10 px-4 py-3 text-white placeholder:text-white/50 outline-none focus:ring-2 focus:ring-white/20 transition-all"
              />
            )}

            <input
              type="email"
              placeholder="Email"
              className="w-full rounded-lg bg-white/10 border border-white/10 px-4 py-3 text-white placeholder:text-white/50 outline-none focus:ring-2 focus:ring-white/20 transition-all"
            />

            <input
              type="password"
              placeholder="Пароль"
              className="w-full rounded-lg bg-white/10 border border-white/10 px-4 py-3 text-white placeholder:text-white/50 outline-none focus:ring-2 focus:ring-white/20 transition-all"
            />

            <button
              type="submit"
              className="w-full bg-white/90 text-black font-medium py-3 rounded-lg hover:bg-white transition-colors mt-6"
            >
              {isLogin ? 'Войти' : 'Зарегистрироваться'}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <p className="text-white/60 text-sm">
              {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-white ml-2 hover:underline font-medium"
              >
                {isLogin ? 'Зарегистрироваться' : 'Войти'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
