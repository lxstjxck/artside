'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { AuthUser, UserProfile } from '@/lib/auth-types';
import { detectBrowserLocation } from '@/lib/browser-location';

type SettingsTab = 'profile' | 'resume' | 'social' | 'account' | 'notifications' | 'password';

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

const tabs: Array<{ id: SettingsTab; label: string; icon: string; description: string }> = [
  { id: 'profile', label: 'Профиль', icon: 'П', description: 'Публичная карточка автора' },
  { id: 'resume', label: 'Резюме', icon: 'Р', description: 'Опыт, формат работы и навыки' },
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

const workPreferenceOptions = [
  { id: 'fullTime', label: 'Полная занятость', description: 'Открыт к постоянной работе в команде или студии.' },
  { id: 'contract', label: 'Контракт', description: 'Готов к проектной занятости с фиксированными сроками.' },
  { id: 'freelance', label: 'Фриланс', description: 'Принимаю разовые заказы и частные комиссии.' },
  { id: 'remote', label: 'Удалённо', description: 'Могу работать с распределённой командой.' },
  { id: 'relocation', label: 'Переезд', description: 'Готов рассмотреть релокацию под подходящий проект.' },
];

const socialLinkFields: Array<{ id: keyof UserProfile['socialLinks']; label: string; placeholder: string }> = [
  { id: 'portfolio', label: 'Портфолио', placeholder: 'https://example.com/portfolio' },
  { id: 'website', label: 'Личный сайт', placeholder: 'https://example.com' },
  { id: 'telegram', label: 'Telegram', placeholder: 'https://t.me/username' },
  { id: 'vk', label: 'VK', placeholder: 'https://vk.com/username' },
  { id: 'dzen', label: 'Дзен', placeholder: 'https://dzen.ru/username' },
  { id: 'rutube', label: 'Rutube', placeholder: 'https://rutube.ru/channel/123456' },
  { id: 'boosty', label: 'Boosty', placeholder: 'https://boosty.to/username' },
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
    remote: false,
    relocation: false,
  });
  const [resumeSummary, setResumeSummary] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [softwareInput, setSoftwareInput] = useState('');
  const [software, setSoftware] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState<UserProfile['socialLinks']>({});
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
        setSkills(profileData.profile.professionalSkills ?? []);
        setSoftware(profileData.profile.professionalSoftware ?? []);
        setResumeHiring({
          fullTime: profileData.profile.hiringTypes?.includes('fullTime') ?? false,
          contract: profileData.profile.hiringTypes?.includes('contract') ?? false,
          freelance: profileData.profile.hiringTypes?.includes('freelance') ?? false,
          remote: profileData.profile.hiringTypes?.includes('remote') ?? false,
          relocation: profileData.profile.hiringTypes?.includes('relocation') ?? false,
        });
        setSocialLinks(profileData.profile.socialLinks ?? {});

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

  const updateProfileField = (field: 'nickname' | 'location' | 'bio' | 'avatarUrl', value: string) => {
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

  const saveResumeSection = async (text: string) => {
    if (!profile) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const hiringTypes = Object.entries(resumeHiring)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key);
      const formData = new FormData();
      formData.set('nickname', profile.nickname);
      formData.set('location', profile.location);
      formData.set('bio', resumeSummary.trim() || profile.bio);
      formData.set('avatarUrl', profile.avatarUrl);
      formData.set('professionalSkills', JSON.stringify(skills));
      formData.set('professionalSoftware', JSON.stringify(software));
      formData.set('publicEmail', profile.publicEmail || email);
      formData.set('showPublicEmail', String(profile.showPublicEmail));
      formData.set('hiringTypes', JSON.stringify(hiringTypes));
      formData.set('publishReady', String(profile.publishReady || Boolean(resumeSummary.trim() || skills.length || software.length || hiringTypes.length)));

      const response = await fetch('/api/profile', {
        method: 'PATCH',
        body: formData,
      });
      const data = (await response.json().catch(() => ({}))) as { profile?: UserProfile; message?: string };
      if (!response.ok || !data.profile) {
        setMessage(data.message ?? 'Не удалось сохранить резюме.');
        return;
      }

      setProfile(data.profile);
      setResumeSummary(data.profile.bio ?? '');
      setSkills(data.profile.professionalSkills ?? []);
      setSoftware(data.profile.professionalSoftware ?? []);
      setResumeHiring({
        fullTime: data.profile.hiringTypes?.includes('fullTime') ?? false,
        contract: data.profile.hiringTypes?.includes('contract') ?? false,
        freelance: data.profile.hiringTypes?.includes('freelance') ?? false,
        remote: data.profile.hiringTypes?.includes('remote') ?? false,
        relocation: data.profile.hiringTypes?.includes('relocation') ?? false,
      });
      setMessage(text);
    } catch {
      setMessage('Сетевая ошибка при сохранении резюме.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveSocialLinks = async (event: React.FormEvent<HTMLFormElement>) => {
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
      formData.set('socialLinks', JSON.stringify(socialLinks));

      const response = await fetch('/api/profile', { method: 'PATCH', body: formData });
      const data = (await response.json().catch(() => ({}))) as { profile?: UserProfile; message?: string };
      if (!response.ok || !data.profile) {
        setMessage(data.message ?? 'Не удалось сохранить ссылки.');
        return;
      }

      setProfile(data.profile);
      setSocialLinks(data.profile.socialLinks ?? {});
      setMessage('Социальные ссылки сохранены.');
    } catch {
      setMessage('Сетевая ошибка при сохранении ссылок.');
    } finally {
      setIsSaving(false);
    }
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
                  {workPreferenceOptions.map((item) => (
                    <label key={item.id} className="settings-page-toggle">
                      <input
                        type="checkbox"
                        checked={Boolean(resumeHiring[item.id as keyof typeof resumeHiring])}
                        onChange={(event) => setResumeHiring((current) => ({ ...current, [item.id]: event.target.checked }))}
                      />
                      <span>
                        <strong>{item.label}</strong>
                        {item.description}
                      </span>
                    </label>
                  ))}
                </div>
                <button type="button" onClick={() => void saveResumeSection('Предпочтения резюме сохранены.')} disabled={isSaving}>Сохранить</button>
              </section>

              <section className="settings-resume-section">
                <h3>Профессиональное описание</h3>
                <label>
                  Краткое резюме
                  <textarea value={resumeSummary} onChange={(event) => setResumeSummary(event.target.value)} placeholder="Опишите свой опыт, специализацию, сильные стороны и тип проектов, с которыми вы работаете." />
                </label>
                <button type="button" onClick={() => void saveResumeSection('Описание резюме сохранено.')} disabled={isSaving}>Сохранить</button>
              </section>

              <section className="settings-resume-section">
                <h3>PDF резюме / портфолио</h3>
                <p>Загрузите PDF-файл с резюме или портфолио. Максимальный размер: 20 МБ.</p>
                <label>
                  Файл PDF
                  <input type="file" accept="application/pdf" />
                </label>
                <button type="button" onClick={() => void saveResumeSection('PDF будет прикреплен после подключения хранения файлов.')} disabled={isSaving}>Сохранить</button>
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
                <button type="button" onClick={() => void saveResumeSection('Навыки сохранены.')} disabled={isSaving}>Сохранить навыки</button>
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
                <button type="button" onClick={() => void saveResumeSection('Программы сохранены.')} disabled={isSaving}>Сохранить программы</button>
              </section>
            </div>
          )}

          {activeTab === 'social' && (
            <form className="settings-page-form" onSubmit={saveSocialLinks}>
              <h3>Социальные сети</h3>
              <p className="settings-page-hint">Добавьте публичные ссылки на сайт, портфолио и рабочие площадки, доступные вашей аудитории.</p>
              {socialLinkFields.map((field) => (
                <label key={field.id}>
                  {field.label}
                  <input
                    type="url"
                    value={socialLinks[field.id] ?? ''}
                    onChange={(event) => setSocialLinks((current) => ({ ...current, [field.id]: event.target.value }))}
                    placeholder={field.placeholder}
                  />
                </label>
              ))}
              <button type="submit" disabled={isSaving}>{isSaving ? 'Сохранение...' : 'Сохранить ссылки'}</button>
            </form>
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
