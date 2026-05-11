'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AuthUser } from '@/lib/auth-types';

type AccountSettingsModalProps = {
  isOpen: boolean;
  user: AuthUser;
  onClose: () => void;
  onUserUpdate?: (user: AuthUser) => void;
};

type SettingsTab = 'account' | 'security' | 'profile' | 'notifications';

type NotificationSettings = {
  notifyLikes: boolean;
  notifyComments: boolean;
  emailNotifications: boolean;
};

const tabs: Array<{ id: SettingsTab; label: string }> = [
  { id: 'account', label: 'Аккаунт' },
  { id: 'security', label: 'Безопасность' },
  { id: 'profile', label: 'Профиль' },
  { id: 'notifications', label: 'Уведомления' },
];

const defaultNotificationSettings: NotificationSettings = {
  notifyLikes: true,
  notifyComments: true,
  emailNotifications: false,
};

export default function AccountSettingsModal({ isOpen, user, onClose, onUserUpdate }: AccountSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setEmail(user.email);
    const controller = new AbortController();

    const loadNotificationSettings = async () => {
      const response = await fetch('/api/notification-settings', {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) return;

      const data = (await response.json()) as { settings?: NotificationSettings };
      if (data.settings) {
        setNotificationSettings(data.settings);
      }
    };

    void loadNotificationSettings();

    return () => controller.abort();
  }, [isOpen, user.email]);

  if (!isOpen) return null;

  const submitAccountSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    try {
      setIsSaving(true);
      const response = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          currentPassword,
          newPassword,
        }),
      });
      const data = (await response.json()) as { message?: string; user?: AuthUser };

      if (!response.ok || !data.user) {
        setMessage(data.message ?? 'Не удалось сохранить настройки аккаунта.');
        return;
      }

      onUserUpdate?.(data.user);
      setEmail(data.user.email);
      setCurrentPassword('');
      setNewPassword('');
      setMessage(data.message ?? 'Настройки аккаунта сохранены.');
    } catch {
      setMessage('Сетевая ошибка при сохранении настроек.');
    } finally {
      setIsSaving(false);
    }
  };

  const submitNotificationSettings = async () => {
    setMessage(null);

    try {
      setIsSavingNotifications(true);
      const response = await fetch('/api/notification-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationSettings),
      });
      const data = (await response.json()) as { message?: string; settings?: NotificationSettings };

      if (!response.ok || !data.settings) {
        setMessage(data.message ?? 'Не удалось сохранить уведомления.');
        return;
      }

      setNotificationSettings(data.settings);
      setMessage(data.message ?? 'Настройки уведомлений сохранены.');
    } catch {
      setMessage('Сетевая ошибка при сохранении уведомлений.');
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const updateNotificationSetting = (field: keyof NotificationSettings, value: boolean) => {
    setNotificationSettings((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <div className="settings-modal-overlay" onClick={() => !isSaving && !isSavingNotifications && onClose()}>
      <section className="settings-modal" onClick={(event) => event.stopPropagation()}>
        <header className="settings-modal-head">
          <div>
            <h2>Настройки</h2>
            <p>{user.username}</p>
          </div>
          <button type="button" onClick={onClose} disabled={isSaving || isSavingNotifications} aria-label="Закрыть настройки">
            x
          </button>
        </header>

        <div className="settings-modal-body">
          <nav className="settings-tabs" aria-label="Разделы настроек">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? 'settings-tab-active' : ''}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMessage(null);
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <form className="settings-panel" onSubmit={submitAccountSettings}>
            {activeTab === 'account' && (
              <>
                <h3>Данные аккаунта</h3>
                <p>Основные данные для входа и связи с аккаунтом.</p>
                <label>
                  Email
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                </label>
                <label>
                  Текущий пароль
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    placeholder="Нужен для сохранения изменений"
                    required
                  />
                </label>
              </>
            )}

            {activeTab === 'security' && (
              <>
                <h3>Безопасность</h3>
                <p>Смена пароля требует текущий пароль. Новый пароль должен соответствовать правилам ArtSide.</p>
                <label>
                  Текущий пароль
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    placeholder="Текущий пароль"
                    required
                  />
                </label>
                <label>
                  Новый пароль
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Минимум 8 символов, цифра и спецсимвол"
                    required
                  />
                </label>
              </>
            )}

            {activeTab === 'profile' && (
              <div className="settings-info-panel">
                <h3>Публичный профиль</h3>
                <p>Аватар, никнейм, локация и описание редактируются на странице профиля, чтобы сразу видеть результат.</p>
                <Link href={`/profile/${user.username}`} onClick={onClose}>
                  Открыть профиль
                </Link>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="settings-info-panel">
                <h3>Уведомления</h3>
                <p>Выберите, какие события будут попадать в колокольчик и какие из них можно дублировать на email.</p>
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={notificationSettings.notifyLikes}
                    onChange={(event) => updateNotificationSetting('notifyLikes', event.target.checked)}
                  />
                  Уведомлять о лайках моих работ
                </label>
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={notificationSettings.notifyComments}
                    onChange={(event) => updateNotificationSetting('notifyComments', event.target.checked)}
                  />
                  Уведомлять о комментариях к моим работам
                </label>
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={notificationSettings.emailNotifications}
                    onChange={(event) => updateNotificationSetting('emailNotifications', event.target.checked)}
                  />
                  Дублировать уведомления на email
                </label>
                <button className="settings-submit" type="button" onClick={() => void submitNotificationSettings()} disabled={isSavingNotifications}>
                  {isSavingNotifications ? 'Сохранение...' : 'Сохранить уведомления'}
                </button>
              </div>
            )}

            {(activeTab === 'account' || activeTab === 'security') && (
              <button className="settings-submit" type="submit" disabled={isSaving}>
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
            )}

            {message && (
              <p className={`settings-message ${message.includes('сохран') ? 'settings-message-ok' : 'settings-message-error'}`}>
                {message}
              </p>
            )}
          </form>
        </div>
      </section>
    </div>
  );
}
