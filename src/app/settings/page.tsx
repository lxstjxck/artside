'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { AuthUser, UserProfile } from '@/lib/auth-types';
import { detectBrowserLocation } from '@/lib/browser-location';

type SettingsTab = 'profile' | 'resume' | 'work-preferences' | 'social' | 'account' | 'notifications' | 'password';

type NotificationSettings = {
  notifyLikes: boolean;
  notifyComments: boolean;
  emailNotifications: boolean;
};

type ProfileResponse = {
  authenticated: boolean;
  user?: AuthUser;
  profile?: UserProfile;
};

type PublishProfileDraft = {
  summary?: string;
  skills?: string[];
  software?: string[];
  publicEmail?: string;
  location?: string;
  hiring?: {
    fullTime?: boolean;
    contract?: boolean;
    freelance?: boolean;
  };
};

const PUBLISH_PROFILE_STORAGE_KEY = 'artside_publish_profile';

const tabs: Array<{ id: SettingsTab; label: string; icon: string; description: string }> = [
  { id: 'profile', label: 'Профиль', icon: 'П', description: 'Публичная карточка автора' },
  { id: 'resume', label: 'Резюме', icon: 'Р', description: 'Опыт и краткое описание' },
  { id: 'work-preferences', label: 'Предпочтения в работе', icon: 'В', description: 'Формат, навыки и интересы' },
  { id: 'social', label: 'Социальные сети', icon: 'С', description: 'Публичные ссылки автора' },
  { id: 'account', label: 'Аккаунт', icon: 'А', description: 'Почта и данные входа' },
  { id: 'notifications', label: 'Уведомления', icon: 'У', description: 'События и почта' },
  { id: 'password', label: 'Пароль', icon: 'К', description: 'Ключ доступа' },
];

const defaultNotificationSettings: NotificationSettings = {
  notifyLikes: true,
  notifyComments: true,
  emailNotifications: false,
};

const readPublishProfileDraft = (): PublishProfileDraft | null => {
  if (typeof window === 'undefined') return null;

  try {
    const value = window.localStorage.getItem(PUBLISH_PROFILE_STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as PublishProfileDraft;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const skillSuggestions = [
  '3D-моделирование',
  '3D-скульптинг',
  '3D-анимация',
  '3D-визуализация',
  '3D-персонажи',
  '3D-окружение',
  'Концепт-арт',
  'Иллюстрация',
  'UI/UX',
  'Графический дизайн',
  'Моушн-дизайн',
  'Ретопология',
  'Текстурирование',
  'Риггинг',
  'Анимация персонажей',
  'Визуальная разработка',
];

const softwareSuggestions = [
  'Blender',
  '3ds Max',
  'Maya',
  'Cinema 4D',
  'ZBrush',
  'Substance Painter',
  'Substance Designer',
  'Photoshop',
  'Illustrator',
  'Figma',
  'After Effects',
  'Premiere Pro',
  'Unreal Engine',
  'Unity',
  'Houdini',
  'OpenCanvas',
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [resumeHiring, setResumeHiring] = useState({
    fullTime: true,
    contract: false,
    freelance: false,
  });
  const [resumeSummary, setResumeSummary] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [softwareInput, setSoftwareInput] = useState('');
  const [software, setSoftware] = useState<string[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const profileHref = user ? `/profile/${user.username}` : '/';
  const settingsCaption = useMemo(() => 'Центр управления профилем', []);

  useEffect(() => {
    const controller = new AbortController();

    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const [profileResponse, notificationsResponse] = await Promise.all([
          fetch('/api/profile', { cache: 'no-store', signal: controller.signal }),
          fetch('/api/notification-settings', { cache: 'no-store', signal: controller.signal }),
        ]);

        const profileData = (await profileResponse.json()) as ProfileResponse;
        if (!profileResponse.ok || !profileData.authenticated || !profileData.user || !profileData.profile) {
          setUser(null);
          setProfile(null);
          setMessage('Войдите в аккаунт, чтобы открыть настройки.');
          return;
        }

        setUser(profileData.user);
        setProfile(profileData.profile);
        setEmail(profileData.user.email);
        setResumeSummary(profileData.profile.bio ?? '');

        const publishDraft = readPublishProfileDraft();
        if (publishDraft) {
          if (publishDraft.location) {
            setProfile((current) => current ? { ...current, location: publishDraft.location ?? current.location } : current);
          }
          setResumeSummary(publishDraft.summary ?? profileData.profile.bio ?? '');
          setSkills(Array.isArray(publishDraft.skills) ? publishDraft.skills : []);
          setSoftware(Array.isArray(publishDraft.software) ? publishDraft.software : []);
          setResumeHiring({
            fullTime: Boolean(publishDraft.hiring?.fullTime),
            contract: Boolean(publishDraft.hiring?.contract),
            freelance: Boolean(publishDraft.hiring?.freelance),
          });
        }

        if (notificationsResponse.ok) {
          const notificationsData = (await notificationsResponse.json()) as { settings?: NotificationSettings };
          if (notificationsData.settings) {
            setNotificationSettings(notificationsData.settings);
          }
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setMessage('Не удалось загрузить настройки.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadSettings();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }

    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const updateProfileField = (field: keyof UserProfile, value: string) => {
    setProfile((current) => current ? { ...current, [field]: value } : current);
  };

  const fillBrowserLocation = async () => {
    setIsDetectingLocation(true);
    setMessage(null);

    try {
      const location = await detectBrowserLocation();
      updateProfileField('location', location);
      setMessage('Местоположение определено. Не забудьте сохранить профиль.');
    } catch {
      setMessage('Не удалось определить местоположение. Проверьте разрешение браузера.');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const submitProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.set('nickname', profile.nickname);
      formData.set('location', profile.location);
      formData.set('bio', profile.bio);
      formData.set('avatarUrl', profile.avatarUrl);
      if (avatarFile) {
        formData.set('avatar', avatarFile);
      }

      const response = await fetch('/api/profile', {
        method: 'PATCH',
        body: formData,
      });
      const data = (await response.json()) as { message?: string; profile?: UserProfile; user?: AuthUser };

      if (!response.ok || !data.profile) {
        setMessage(data.message ?? 'Не удалось сохранить профиль.');
        return;
      }

      setProfile(data.profile);
      if (data.user) setUser(data.user);
      setAvatarFile(null);
      setMessage('Профиль сохранен.');
    } catch {
      setMessage('Сетевая ошибка при сохранении профиля.');
    } finally {
      setIsSaving(false);
    }
  };

  const submitAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, currentPassword }),
      });
      const data = (await response.json()) as { message?: string; user?: AuthUser };

      if (!response.ok || !data.user) {
        setMessage(data.message ?? 'Не удалось сохранить аккаунт.');
        return;
      }

      setUser(data.user);
      setEmail(data.user.email);
      setCurrentPassword('');
      setMessage('Аккаунт сохранен.');
    } catch {
      setMessage('Сетевая ошибка при сохранении аккаунта.');
    } finally {
      setIsSaving(false);
    }
  };

  const submitPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user?.email, currentPassword, newPassword }),
      });
      const data = (await response.json()) as { message?: string; user?: AuthUser };

      if (!response.ok || !data.user) {
        setMessage(data.message ?? 'Не удалось обновить пароль.');
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setMessage('Пароль обновлен.');
    } catch {
      setMessage('Сетевая ошибка при обновлении пароля.');
    } finally {
      setIsSaving(false);
    }
  };

  const submitNotifications = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
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
      setMessage('Уведомления сохранены.');
    } catch {
      setMessage('Сетевая ошибка при сохранении уведомлений.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateNotificationSetting = (field: keyof NotificationSettings, value: boolean) => {
    setNotificationSettings((current) => ({ ...current, [field]: value }));
  };

  const getSuggestions = (value: string, source: string[], selected: string[]) => {
    const query = value.trim().toLowerCase();
    if (query.length < 2) return [];
    return source
      .filter((item) => item.toLowerCase().includes(query) && !selected.includes(item))
      .slice(0, 8);
  };

  const saveResumeDraft = () => {
    window.localStorage.setItem(PUBLISH_PROFILE_STORAGE_KEY, JSON.stringify({
      summary: resumeSummary.trim(),
      skills,
      software,
      publicEmail: email,
      location: profile?.location ?? '',
      hiring: resumeHiring,
    }));
    window.localStorage.setItem('artside_publish_ready', '1');
  };

  const saveLocalResumeSection = async (text: string) => {
    saveResumeDraft();

    if (profile) {
      const formData = new FormData();
      formData.set('nickname', profile.nickname);
      formData.set('location', profile.location);
      formData.set('bio', resumeSummary.trim() || profile.bio);
      formData.set('avatarUrl', profile.avatarUrl);
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        body: formData,
      });
      const data = (await response.json().catch(() => ({}))) as { profile?: UserProfile; message?: string };
      if (response.ok && data.profile) {
        setProfile(data.profile);
      }
    }

    setMessage(text);
  };

  const addListItem = (value: string, setValue: (value: string) => void, setItems: React.Dispatch<React.SetStateAction<string[]>>) => {
    const normalized = value.trim().replace(/\s+/g, ' ');
    if (!normalized) return;
    setItems((current) => current.includes(normalized) ? current : [...current, normalized]);
    setValue('');
  };

  const skillMatches = getSuggestions(skillInput, skillSuggestions, skills);
  const softwareMatches = getSuggestions(softwareInput, softwareSuggestions, software);

  if (isLoading) {
    return (
      <main className="settings-page">
        <p className="settings-page-loading">Загрузка настроек...</p>
      </main>
    );
  }

  if (!user || !profile) {
    return (
      <main className="settings-page">
        <section className="settings-auth-required">
          <h1>Настройки</h1>
          <p>{message ?? 'Войдите в аккаунт, чтобы открыть настройки.'}</p>
          <Link href="/">На главную</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="settings-page">
      <aside className="settings-sidebar">
        <div className="settings-user-card">
          <div className="settings-avatar">
            {avatarPreview || profile.avatarUrl ? (
              <Image src={avatarPreview ?? profile.avatarUrl} alt="Аватар профиля" width={112} height={112} unoptimized />
            ) : (
              <span>{profile.nickname.slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div>
            <small>НАСТРОЙКИ</small>
            <h1>{profile.nickname}</h1>
            <p>{settingsCaption}</p>
          </div>
        </div>

        <nav className="settings-side-nav" aria-label="Разделы настроек">
          {tabs.map((tab) => (
            <div key={tab.id} className={tab.id === 'account' ? 'settings-side-group-break' : undefined}>
              <button
                type="button"
                className={activeTab === tab.id ? 'settings-side-active' : ''}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMessage(null);
                  setCurrentPassword('');
                  setNewPassword('');
                }}
              >
                <span>{tab.icon}</span>
                <span className="settings-side-copy">
                  <strong>{tab.label}</strong>
                  <small>{tab.description}</small>
                </span>
              </button>
            </div>
          ))}
        </nav>
      </aside>

      <section className="settings-workspace">
        <header className="settings-workspace-head">
          <div>
            <h2>{tabs.find((tab) => tab.id === activeTab)?.label}</h2>
            <p>{tabs.find((tab) => tab.id === activeTab)?.description}</p>
          </div>
          <Link href={profileHref}>Открыть профиль</Link>
        </header>

        <div className="settings-workspace-body">
          {activeTab === 'profile' && (
            <form className="settings-page-form" onSubmit={submitProfile}>
              <label>
                Никнейм
                <input value={profile.nickname} onChange={(event) => updateProfileField('nickname', event.target.value)} minLength={2} maxLength={40} required />
              </label>
              <label>
                Локация
                <span className="settings-location-row">
                  <input value={profile.location} onChange={(event) => updateProfileField('location', event.target.value)} maxLength={80} />
                  <button type="button" onClick={() => void fillBrowserLocation()} disabled={isDetectingLocation || isSaving}>
                    {isDetectingLocation ? 'Определяем...' : 'Определить город'}
                  </button>
                </span>
              </label>
              <label>
                Описание
                <textarea value={profile.bio} onChange={(event) => updateProfileField('bio', event.target.value)} maxLength={600} />
              </label>
              <label>
                Аватар
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)} />
              </label>
              <label>
                Ссылка на аватар
                <input value={profile.avatarUrl} onChange={(event) => updateProfileField('avatarUrl', event.target.value)} disabled={Boolean(avatarFile)} />
              </label>
              <button type="submit" disabled={isSaving}>{isSaving ? 'Сохранение...' : 'Сохранить профиль'}</button>
            </form>
          )}

          {activeTab === 'account' && (
            <form className="settings-page-form" onSubmit={submitAccount}>
              <label>
                Почта
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </label>
              <label>
                Текущий пароль
                <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
              </label>
              <button type="submit" disabled={isSaving}>{isSaving ? 'Сохранение...' : 'Сохранить аккаунт'}</button>
            </form>
          )}

          {activeTab === 'resume' && (
            <div className="settings-resume">
              <section className="settings-resume-section">
                <h3>Готовность к работе</h3>
                <p>Отметьте форматы сотрудничества, которые вам интересны.</p>
                <div className="settings-choice-grid">
                  <label className="settings-page-toggle">
                    <input type="checkbox" checked={resumeHiring.fullTime} onChange={(event) => setResumeHiring((current) => ({ ...current, fullTime: event.target.checked }))} />
                    <span><strong>Полная занятость</strong></span>
                  </label>
                  <label className="settings-page-toggle">
                    <input type="checkbox" checked={resumeHiring.contract} onChange={(event) => setResumeHiring((current) => ({ ...current, contract: event.target.checked }))} />
                    <span><strong>Контракт</strong></span>
                  </label>
                  <label className="settings-page-toggle">
                    <input type="checkbox" checked={resumeHiring.freelance} onChange={(event) => setResumeHiring((current) => ({ ...current, freelance: event.target.checked }))} />
                    <span><strong>Фриланс</strong></span>
                  </label>
                </div>
                <button type="button" onClick={() => saveLocalResumeSection('Предпочтения резюме сохранены.')}>Сохранить</button>
              </section>

              <section className="settings-resume-section">
                <h3>Профессиональное описание</h3>
                <label>
                  Краткое резюме
                  <textarea value={resumeSummary} onChange={(event) => setResumeSummary(event.target.value)} placeholder="Опишите свой опыт, специализацию, сильные стороны и тип проектов, с которыми вы работаете." />
                </label>
                <button type="button" onClick={() => saveLocalResumeSection('Описание резюме сохранено.')}>Сохранить</button>
              </section>

              <section className="settings-resume-section">
                <h3>PDF резюме / портфолио</h3>
                <p>Загрузите PDF-файл с резюме или портфолио. Максимальный размер: 20 МБ.</p>
                <label>
                  Файл PDF
                  <input type="file" accept="application/pdf" />
                </label>
                <button type="button" onClick={() => saveLocalResumeSection('PDF будет прикреплен после подключения хранения файлов.')}>Сохранить</button>
              </section>

              <section className="settings-resume-section">
                <h3>Навыки</h3>
                <div className="settings-tag-list">
                  {skills.map((skill) => (
                    <button key={skill} type="button" onClick={() => setSkills((current) => current.filter((item) => item !== skill))}>
                      {skill}<span aria-hidden="true">x</span>
                    </button>
                  ))}
                </div>
                <div className="settings-suggest-field">
                  <label>
                    Добавить область экспертизы
                    <input
                      value={skillInput}
                      onChange={(event) => setSkillInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          addListItem(skillInput, setSkillInput, setSkills);
                        }
                      }}
                      placeholder="Например: 3d, концепт, UI"
                    />
                  </label>
                  {skillMatches.length > 0 && (
                    <div className="settings-suggest-list">
                      {skillMatches.map((item) => (
                        <button key={item} type="button" onClick={() => addListItem(item, setSkillInput, setSkills)}>
                          {item}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => addListItem(skillInput, setSkillInput, setSkills)}>Добавить навык</button>
              </section>

              <section className="settings-resume-section">
                <h3>Программы</h3>
                <div className="settings-tag-list">
                  {software.map((item) => (
                    <button key={item} type="button" onClick={() => setSoftware((current) => current.filter((value) => value !== item))}>
                      {item}<span aria-hidden="true">x</span>
                    </button>
                  ))}
                </div>
                <div className="settings-suggest-field">
                  <label>
                    Добавить программу
                    <input
                      value={softwareInput}
                      onChange={(event) => setSoftwareInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          addListItem(softwareInput, setSoftwareInput, setSoftware);
                        }
                      }}
                      placeholder="Например: Bl, Fig, 3d"
                    />
                  </label>
                  {softwareMatches.length > 0 && (
                    <div className="settings-suggest-list">
                      {softwareMatches.map((item) => (
                        <button key={item} type="button" onClick={() => addListItem(item, setSoftwareInput, setSoftware)}>
                          {item}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => addListItem(softwareInput, setSoftwareInput, setSoftware)}>Добавить программу</button>
              </section>
            </div>
          )}

          {activeTab === 'work-preferences' && (
            <section className="settings-static-panel">
              <h3>Предпочтения в работе</h3>
              <p>Укажите форматы сотрудничества и направления, которые вам интересны.</p>
              <div className="settings-choice-grid">
                {['Полная занятость', 'Контракт', 'Фриланс', 'Удалённо', 'Переезд'].map((item) => (
                  <label key={item} className="settings-page-toggle">
                    <input type="checkbox" />
                    <span><strong>{item}</strong></span>
                  </label>
                ))}
              </div>
              <button type="button" disabled>Сохранение скоро появится</button>
            </section>
          )}

          {activeTab === 'social' && (
            <section className="settings-static-panel">
              <h3>Социальные сети</h3>
              <p>Добавьте публичные ссылки на портфолио, сайт и социальные профили.</p>
              <label>
                Сайт или портфолио
                <input placeholder="https://example.com" />
              </label>
              <label>
                Социальная сеть
                <input placeholder="https://..." />
              </label>
              <button type="button" disabled>Сохранение скоро появится</button>
            </section>
          )}

          {activeTab === 'notifications' && (
            <form className="settings-page-form" onSubmit={submitNotifications}>
              <label className="settings-page-toggle">
                <input type="checkbox" checked={notificationSettings.notifyLikes} onChange={(event) => updateNotificationSetting('notifyLikes', event.target.checked)} />
                <span>
                  <strong>Лайки</strong>
                  Уведомлять о лайках моих работ
                </span>
              </label>
              <label className="settings-page-toggle">
                <input type="checkbox" checked={notificationSettings.notifyComments} onChange={(event) => updateNotificationSetting('notifyComments', event.target.checked)} />
                <span>
                  <strong>Комментарии</strong>
                  Уведомлять о комментариях к моим работам
                </span>
              </label>
              <label className="settings-page-toggle">
                <input type="checkbox" checked={notificationSettings.emailNotifications} onChange={(event) => updateNotificationSetting('emailNotifications', event.target.checked)} />
                <span>
                  <strong>Почта</strong>
                  Дублировать уведомления на почту
                </span>
              </label>
              <button type="submit" disabled={isSaving}>{isSaving ? 'Сохранение...' : 'Сохранить уведомления'}</button>
            </form>
          )}

          {activeTab === 'password' && (
            <form className="settings-page-form" onSubmit={submitPassword}>
              <label>
                Текущий пароль
                <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
              </label>
              <label>
                Новый пароль
                <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
              </label>
              <p className="settings-page-hint">Минимум 8 символов: заглавная и строчная буквы, цифра и спецсимвол.</p>
              <button type="submit" disabled={isSaving}>{isSaving ? 'Сохранение...' : 'Обновить пароль'}</button>
            </form>
          )}

          {message && (
            <p className={`settings-page-message ${message.includes('сохран') || message.includes('обнов') ? 'settings-page-message-ok' : 'settings-page-message-error'}`}>
              {message}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
