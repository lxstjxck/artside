'use client';

import { useMemo, useState } from 'react';
import type { AuthUser } from '@/lib/auth-types';
import { getPasswordChecks, isPasswordValid as validatePassword, isUsernameValid } from '@/lib/auth-validation';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: AuthUser) => void;
  resetToken?: string | null;
  initialMode?: AuthMode;
}

export default function AuthModal({ isOpen, onClose, onSuccess, resetToken, initialMode }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode ?? (resetToken ? 'reset' : 'login'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setUsername('');
    setIsSubmitted(false);
    setErrorMessage(null);
    setInfoMessage(null);
    setDevResetUrl(null);
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    resetForm();
  };

  const passwordChecks = useMemo(() => getPasswordChecks(password), [password]);
  const isRegisterFormValid = isUsernameValid(username.trim()) && email.trim().length > 0 && validatePassword(password);
  const isLoginFormValid = email.trim().length > 0 && password.trim().length > 0;
  const isForgotFormValid = email.trim().length > 0;
  const isResetFormValid = Boolean(resetToken) && validatePassword(password);

  const submitLoginOrRegister = async () => {
    const isLogin = mode === 'login';
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin ? { email, password } : { username, email, password };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  };

  const submitForgot = async () => {
    const response = await fetch('/api/auth/password-reset/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = (await response.json()) as { message?: string; devResetUrl?: string };
    if (!response.ok) {
      setErrorMessage(data.message ?? 'Не удалось отправить запрос восстановления.');
      return;
    }

    setInfoMessage(data.message ?? 'Если аккаунт существует, ссылка восстановления будет отправлена.');
    setDevResetUrl(data.devResetUrl ?? null);
  };

  const submitReset = async () => {
    const response = await fetch('/api/auth/password-reset/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, password }),
    });

    const data = (await response.json()) as { message?: string };
    if (!response.ok) {
      setErrorMessage(data.message ?? 'Не удалось обновить пароль.');
      return;
    }

    setInfoMessage(data.message ?? 'Пароль обновлен.');
    setPassword('');
    window.history.replaceState(null, '', window.location.pathname);
    setTimeout(() => switchMode('login'), 800);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitted(true);
    setErrorMessage(null);
    setInfoMessage(null);

    if (mode === 'login' && !isLoginFormValid) return;
    if (mode === 'register' && !isRegisterFormValid) return;
    if (mode === 'forgot' && !isForgotFormValid) return;
    if (mode === 'reset' && !isResetFormValid) return;

    const submit = async () => {
      try {
        setIsLoading(true);
        if (mode === 'forgot') {
          await submitForgot();
        } else if (mode === 'reset') {
          await submitReset();
        } else {
          await submitLoginOrRegister();
        }
      } catch {
        setErrorMessage('Сетевая ошибка. Проверьте подключение и повторите попытку.');
      } finally {
        setIsLoading(false);
      }
    };

    void submit();
  };

  if (!isOpen) return null;

  const isLogin = mode === 'login';
  const isRegister = mode === 'register';
  const isForgot = mode === 'forgot';
  const isReset = mode === 'reset';
  const title = isLogin ? 'Вход' : isRegister ? 'Регистрация' : isForgot ? 'Восстановление пароля' : 'Новый пароль';
  const subtitle = isForgot
    ? 'Введите email аккаунта, чтобы получить ссылку восстановления'
    : isReset
      ? 'Придумайте новый пароль для аккаунта'
      : isLogin
        ? 'Войдите в свой аккаунт Название'
        : 'Создайте новый аккаунт Название';
  const submitText = isLoading
    ? 'Загрузка...'
    : isForgot
      ? 'Отправить ссылку'
      : isReset
        ? 'Сохранить пароль'
        : isLogin
          ? 'Войти'
          : 'Зарегистрироваться';

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-scale-in">
        <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-black p-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-3xl text-white/60 transition-colors hover:text-white cursor-pointer"
            aria-label="Закрыть"
          >
            x
          </button>

          <div className="mb-8 text-center">
            <h2 className="mb-2 text-2xl font-semibold text-white">{title}</h2>
            <p className="text-sm text-white/60">{subtitle}</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {isRegister && (
              <input
                type="text"
                placeholder="Имя пользователя"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition-all placeholder:text-white/50 focus:ring-2 focus:ring-white/20"
              />
            )}

            {!isReset && (
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition-all placeholder:text-white/50 focus:ring-2 focus:ring-white/20"
              />
            )}

            {!isForgot && (
              <input
                type="password"
                placeholder={isReset ? 'Новый пароль' : 'Пароль'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition-all placeholder:text-white/50 focus:ring-2 focus:ring-white/20"
              />
            )}

            {(isRegister || isReset) && (
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

            {isRegister && isSubmitted && !isRegisterFormValid && (
              <p className="text-sm text-red-300">Имя: 2-24 символа, латиница, цифры или _. Пароль должен выполнить все требования.</p>
            )}
            {isReset && isSubmitted && !isResetFormValid && (
              <p className="text-sm text-red-300">Ссылка восстановления недействительна или пароль не соответствует требованиям.</p>
            )}
            {errorMessage && <p className="text-sm text-red-300">{errorMessage}</p>}
            {infoMessage && <p className="text-sm text-emerald-300">{infoMessage}</p>}
            {devResetUrl && (
              <a className="block break-all text-sm text-white underline" href={devResetUrl}>
                Dev-ссылка восстановления
              </a>
            )}

            <button
              type="submit"
              disabled={isLoading || (isRegister && !isRegisterFormValid)}
              className="mt-6 w-full rounded-lg bg-white/90 py-3 font-medium text-black transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {submitText}
            </button>
          </form>

          <div className="mt-6 space-y-3 text-center">
            {isLogin && (
              <button type="button" onClick={() => switchMode('forgot')} className="text-sm font-medium text-white hover:underline cursor-pointer">
                Забыли пароль?
              </button>
            )}
            <p className="text-sm text-white/60">
              {isRegister ? 'Уже есть аккаунт?' : 'Нет аккаунта?'}
              <button
                type="button"
                onClick={() => switchMode(isRegister ? 'login' : 'register')}
                className="ml-2 font-medium text-white hover:underline cursor-pointer"
              >
                {isRegister ? 'Войти' : 'Зарегистрироваться'}
              </button>
            </p>
            {(isForgot || isReset) && (
              <button type="button" onClick={() => switchMode('login')} className="text-sm font-medium text-white/80 hover:text-white hover:underline cursor-pointer">
                Вернуться ко входу
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
