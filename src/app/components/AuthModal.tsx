'use client';

import { useMemo, useState } from 'react';
import type { AuthUser } from '@/lib/auth-types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: AuthUser) => void;
}

const PASSWORD_RULES = {
  minLength: (value: string) => value.length >= 8,
  hasUppercase: (value: string) => /[A-Z]/.test(value),
  hasLowercase: (value: string) => /[a-z]/.test(value),
  hasNumber: (value: string) => /\d/.test(value),
  hasSpecial: (value: string) => /[^A-Za-z0-9]/.test(value),
};

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setUsername('');
    setIsSubmitted(false);
  };

  const passwordChecks = useMemo(
    () => ({
      minLength: PASSWORD_RULES.minLength(password),
      hasUppercase: PASSWORD_RULES.hasUppercase(password),
      hasLowercase: PASSWORD_RULES.hasLowercase(password),
      hasNumber: PASSWORD_RULES.hasNumber(password),
      hasSpecial: PASSWORD_RULES.hasSpecial(password),
    }),
    [password]
  );

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);
  const isRegisterFormValid = username.trim().length > 1 && email.trim().length > 0 && isPasswordValid;
  const isLoginFormValid = email.trim().length > 0 && password.trim().length > 0;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitted(true);
    setErrorMessage(null);

    if (!isLogin && !isRegisterFormValid) return;
    if (isLogin && !isLoginFormValid) return;

    const submitAuth = async () => {
      try {
        setIsLoading(true);
        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        const payload = isLogin
          ? { email, password }
          : { username, email, password };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = (await response.json()) as { message?: string; user?: AuthUser };
        if (!response.ok || !data.user) {
          setErrorMessage(data.message ?? 'Не удалось выполнить запрос. Попробуйте снова.');
          return;
        }

        onSuccess?.(data.user);
        onClose();
        resetForm();
      } catch {
        setErrorMessage('Сетевая ошибка. Проверьте подключение и повторите попытку.');
      } finally {
        setIsLoading(false);
      }
    };

    void submitAuth();
  };

  const toggleMode = () => {
    setIsLogin((prev) => !prev);
    setErrorMessage(null);
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-scale-in">
        <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-black p-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-3xl text-white/60 transition-colors hover:text-white"
            aria-label="Закрыть"
          >
            ×
          </button>

          <div className="mb-8 text-center">
            <h2 className="mb-2 text-2xl font-semibold text-white">{isLogin ? 'Вход' : 'Регистрация'}</h2>
            <p className="text-sm text-white/60">
              {isLogin ? 'Войдите в свой аккаунт ArtSide' : 'Создайте новый аккаунт ArtSide'}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {!isLogin && (
              <input
                type="text"
                placeholder="Имя пользователя"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition-all placeholder:text-white/50 focus:ring-2 focus:ring-white/20"
              />
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition-all placeholder:text-white/50 focus:ring-2 focus:ring-white/20"
            />

            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition-all placeholder:text-white/50 focus:ring-2 focus:ring-white/20"
            />

            {!isLogin && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/70">
                <p className="mb-2 text-white/80">Пароль должен содержать:</p>
                <ul className="space-y-1">
                  <li className={passwordChecks.minLength ? 'text-emerald-300' : 'text-white/60'}>Минимум 8 символов</li>
                  <li className={passwordChecks.hasUppercase ? 'text-emerald-300' : 'text-white/60'}>Хотя бы одну заглавную букву</li>
                  <li className={passwordChecks.hasLowercase ? 'text-emerald-300' : 'text-white/60'}>Хотя бы одну строчную букву</li>
                  <li className={passwordChecks.hasNumber ? 'text-emerald-300' : 'text-white/60'}>Хотя бы одну цифру</li>
                  <li className={passwordChecks.hasSpecial ? 'text-emerald-300' : 'text-white/60'}>Хотя бы один спецсимвол</li>
                </ul>
              </div>
            )}

            {!isLogin && isSubmitted && !isRegisterFormValid && (
              <p className="text-sm text-red-300">Заполните поля и выполните требования к паролю.</p>
            )}
            {errorMessage && <p className="text-sm text-red-300">{errorMessage}</p>}

            <button
              type="submit"
              disabled={isLoading || (!isLogin && !isRegisterFormValid)}
              className="mt-6 w-full rounded-lg bg-white/90 py-3 font-medium text-black transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-white/60">
              {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
              <button type="button" onClick={toggleMode} className="ml-2 font-medium text-white hover:underline">
                {isLogin ? 'Зарегистрироваться' : 'Войти'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
