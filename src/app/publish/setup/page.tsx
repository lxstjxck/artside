'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AuthUser, UserProfile } from '@/lib/auth-types';
import { detectBrowserLocation } from '@/lib/browser-location';

type ProfileResponse = {
  authenticated: boolean;
  user?: AuthUser;
  profile?: UserProfile;
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
  'Текстурирование',
  'Риггинг',
  'Анимация персонажей',
];

const softwareSuggestions = [
  'Blender',
  '3ds Max',
  'Maya',
  'Cinema 4D',
  'ZBrush',
  'Substance Painter',
  'Photoshop',
  'Illustrator',
  'Figma',
  'Unreal Engine',
  'Unity',
  'Houdini',
];

type SuggestFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  suggestions: string[];
  selected: string[];
  required?: boolean;
  onValueChange: (value: string) => void;
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
};

function SuggestField({ label, value, placeholder, suggestions, selected, required = false, onValueChange, onAdd, onRemove }: SuggestFieldProps) {
  const matches = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (query.length < 2) return [];
    return suggestions.filter((item) => item.toLowerCase().includes(query) && !selected.includes(item)).slice(0, 8);
  }, [selected, suggestions, value]);

  const addValue = (nextValue: string) => {
    const prepared = nextValue.trim();
    if (!prepared) return;
    onAdd(prepared);
    onValueChange('');
  };

  return (
    <div className="publish-setup-field">
      <label>{label}{required && <span className="publish-required-mark"> *</span>}</label>
      {selected.length > 0 && (
        <div className="settings-tag-list">
          {selected.map((item) => (
            <button key={item} type="button" onClick={() => onRemove(item)}>
              {item}
              <span aria-hidden="true">x</span>
            </button>
          ))}
        </div>
      )}
      <div className="settings-suggest-field">
        <input
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addValue(value);
            }
          }}
          placeholder={placeholder}
        />
        {matches.length > 0 && (
          <div className="settings-suggest-list">
            {matches.map((item) => (
              <button key={item} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => addValue(item)}>
                {item}
              </button>
            ))}
          </div>
        )}
      </div>
      <p>Начните вводить минимум две буквы. Если варианта нет, нажмите Enter и добавьте свой.</p>
    </div>
  );
}

export default function PublishSetupPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [location, setLocation] = useState('');
  const [summary, setSummary] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [softwareInput, setSoftwareInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [software, setSoftware] = useState<string[]>([]);
  const [showEmail, setShowEmail] = useState(true);
  const [publicEmail, setPublicEmail] = useState('');
  const [hiring, setHiring] = useState({ fullTime: false, contract: false, freelance: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [acceptedRules, setAcceptedRules] = useState(false);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  useEffect(() => {
    const controller = new AbortController();

    const loadProfile = async () => {
      try {
        const response = await fetch('/api/profile', { cache: 'no-store', signal: controller.signal });
        const data = (await response.json()) as ProfileResponse;
        if (!response.ok || !data.authenticated || !data.user || !data.profile) {
          setMessage('Войдите в аккаунт, чтобы подготовить профиль для публикации.');
          return;
        }

        setUser(data.user);
        setProfile(data.profile);
        setPublicEmail(data.user.email);
        setLocation(data.profile.location ?? '');
        setSummary(data.profile.bio ?? '');
        setSkills(data.profile.professionalSkills ?? []);
        setSoftware(data.profile.professionalSoftware ?? []);
        setShowEmail(data.profile.showPublicEmail ?? true);
        setPublicEmail(data.profile.publicEmail || data.user.email);
        setHiring({
          fullTime: data.profile.hiringTypes?.includes('fullTime') ?? false,
          contract: data.profile.hiringTypes?.includes('contract') ?? false,
          freelance: data.profile.hiringTypes?.includes('freelance') ?? false,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setMessage('Не удалось загрузить данные профиля.');
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void loadProfile();

    return () => controller.abort();
  }, []);

  const addSkill = (value: string) => setSkills((current) => current.includes(value) ? current : [...current, value].slice(0, 12));
  const addSoftware = (value: string) => setSoftware((current) => current.includes(value) ? current : [...current, value].slice(0, 12));

  const fillBrowserLocation = async () => {
    setIsDetectingLocation(true);
    setMessage(null);

    try {
      const detectedLocation = await detectBrowserLocation();
      setLocation(detectedLocation);
      setMessage('Местоположение определено.');
    } catch {
      setMessage('Не удалось определить местоположение. Проверьте разрешение браузера.');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const submitSetup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!user || !profile) {
      setMessage('Сначала войдите в аккаунт.');
      return;
    }

    if (!location.trim()) {
      setMessage('Укажите город и страну.');
      return;
    }

    if (summary.trim().length < 20) {
      setMessage('Добавьте профессиональное описание минимум на 20 символов.');
      return;
    }

    if (skills.length === 0) {
      setMessage('Добавьте хотя бы один навык.');
      return;
    }

    if (software.length === 0) {
      setMessage('Добавьте хотя бы одну используемую программу.');
      return;
    }

    if (showEmail && !emailPattern.test(publicEmail.trim())) {
      setMessage('Укажите корректную публичную почту или выберите вариант не показывать почту.');
      return;
    }

    if (!hiring.fullTime && !hiring.contract && !hiring.freelance) {
      setMessage('Выберите хотя бы один формат работы.');
      return;
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.set('nickname', profile.nickname || user.username);
      formData.set('location', location.trim() || profile.location || 'Не указано');
      formData.set('bio', summary.trim());
      formData.set('avatarUrl', profile.avatarUrl ?? '');
      formData.set('professionalSkills', JSON.stringify(skills));
      formData.set('professionalSoftware', JSON.stringify(software));
      formData.set('publicEmail', showEmail ? publicEmail.trim() : '');
      formData.set('showPublicEmail', String(showEmail));
      formData.set('hiringTypes', JSON.stringify(Object.entries(hiring).filter(([, enabled]) => enabled).map(([key]) => key)));
      formData.set('publishReady', 'true');

      const response = await fetch('/api/profile', {
        method: 'PATCH',
        body: formData,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message ?? 'Не удалось сохранить профиль для публикации.');
      }

      setShowRules(true);
    } catch (error) {
      setMessage((error as Error).message || 'Не удалось сохранить профиль для публикации.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <main className="publish-setup-page">
        <p className="publish-muted">Загрузка профиля...</p>
      </main>
    );
  }

  return (
    <main className="publish-setup-page">
      <form className="publish-setup-card" onSubmit={submitSetup}>
        <header>
          <p>Публикация первой работы</p>
          <h1>Профессиональный профиль</h1>
          <span>Перед первой публикацией заполните краткое резюме автора. Эти данные помогут понять ваш опыт и контекст работ.</span>
        </header>

        <section className="publish-setup-section">
          <h2>Имя пользователя</h2>
          <label>
            Публичный адрес профиля<span className="publish-required-mark"> *</span>
            <input value={user?.username ?? ''} readOnly />
          </label>
          <div className="publish-setup-checks">
            <span>Длина от 3 до 63 символов</span>
            <span>Можно использовать буквы, цифры, дефис и нижнее подчеркивание</span>
            <span>Не начинается и не заканчивается символами дефиса или нижнего подчеркивания</span>
            <span>Не состоит только из цифр</span>
          </div>
        </section>

        <section className="publish-setup-section">
          <h2>Местоположение</h2>
          <p>Город будет отображаться в публичном профиле. Можно заполнить вручную или определить через браузер.</p>
          <label>
            Город и страна<span className="publish-required-mark"> *</span>
            <span className="publish-location-row">
              <input required value={location} onChange={(event) => setLocation(event.target.value)} maxLength={80} placeholder="Например: Москва, Россия" />
              <button type="button" onClick={() => void fillBrowserLocation()} disabled={isDetectingLocation || isSaving}>
                {isDetectingLocation ? 'Определяем...' : 'Определить город'}
              </button>
            </span>
          </label>
        </section>

        <section className="publish-setup-section">
          <h2>Профессиональное описание</h2>
          <label>
            Краткое резюме<span className="publish-required-mark"> *</span>
            <textarea
              required
              minLength={20}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Опишите ваши навыки, опыт и направление в визуальном искусстве."
            />
          </label>
        </section>

        <section className="publish-setup-section">
          <h2>Навыки</h2>
          <SuggestField
            label="Добавьте область экспертизы"
            value={skillInput}
            placeholder="Например: концепт-арт, 3D-моделирование, UI/UX"
            suggestions={skillSuggestions}
            selected={skills}
            required
            onValueChange={setSkillInput}
            onAdd={addSkill}
            onRemove={(value) => setSkills((current) => current.filter((item) => item !== value))}
          />
        </section>

        <section className="publish-setup-section">
          <h2>Программы</h2>
          <SuggestField
            label="Добавьте используемые программы"
            value={softwareInput}
            placeholder="Например: Photoshop, Blender, Figma"
            suggestions={softwareSuggestions}
            selected={software}
            required
            onValueChange={setSoftwareInput}
            onAdd={addSoftware}
            onRemove={(value) => setSoftware((current) => current.filter((item) => item !== value))}
          />
        </section>

        <section className="publish-setup-section">
          <h2>Контактная информация</h2>
          <p>Какая почта будет видна публично? Можно использовать адрес, отличный от почты входа.</p>
          <label className="publish-radio-row">
            <input type="radio" checked={showEmail} onChange={() => setShowEmail(true)} />
            Показывать почту
          </label>
          {showEmail && (
            <label>
              Email<span className="publish-required-mark"> *</span>
              <input required={showEmail} type="email" value={publicEmail} onChange={(event) => setPublicEmail(event.target.value)} placeholder="email@example.com" />
            </label>
          )}
          <label className="publish-radio-row">
            <input type="radio" checked={!showEmail} onChange={() => setShowEmail(false)} />
            Не показывать почту
          </label>
        </section>

        <section className="publish-setup-section">
          <h2>Готовность к работе</h2>
          <p>Какие форматы работы вам интересны?</p>
          {[
            ['fullTime', 'Полная занятость'],
            ['contract', 'Контракт'],
            ['freelance', 'Фриланс'],
          ].map(([key, label]) => (
            <label key={key} className="publish-radio-row">
              <input
                type="checkbox"
                checked={hiring[key as keyof typeof hiring]}
                onChange={(event) => setHiring((current) => ({ ...current, [key]: event.target.checked }))}
              />
              {label}
            </label>
          ))}
        </section>

        {message && <p className="publish-form-message">{message}</p>}

        <button className="publish-primary-btn" type="submit" disabled={isSaving}>
          {isSaving ? 'Сохранение...' : 'Сохранить и продолжить'}
        </button>
      </form>

      {showRules && (
        <div className="publish-rules-overlay" onClick={() => setShowRules(false)}>
          <section className="publish-rules-modal" onClick={(event) => event.stopPropagation()}>
            <h2>Публикуете впервые?</h2>
            <p>Чтобы сохранить качество сообщества, перед публикацией подтвердите правила размещения работ.</p>

            <div className="publish-rule-item publish-rule-ok">
              <strong>Публикуйте визуальные работы</strong>
              <span>Иллюстрации, концепт-арт, 2D/3D, интерфейсы, анимационные кадры, скетчи и другие авторские визуальные проекты.</span>
            </div>
            <div className="publish-rule-item publish-rule-ok">
              <strong>Только собственные материалы</strong>
              <span>Размещайте работы, которые создали вы или ваша команда и на публикацию которых у вас есть права.</span>
            </div>
            <div className="publish-rule-item publish-rule-stop">
              <strong>Взрослый контент запрещен</strong>
              <span>Контент 18+, эротика, сексуализированные материалы и NSFW полностью запрещены. Отдельных меток для такого контента на платформе нет.</span>
            </div>
            <div className="publish-rule-item publish-rule-stop">
              <strong>Не публикуйте чужие работы</strong>
              <span>Платформа предназначена для портфолио авторов, поэтому плагиат и выдача чужих материалов за свои недопустимы.</span>
            </div>

            <label className="publish-rules-accept">
              <input type="checkbox" checked={acceptedRules} onChange={(event) => setAcceptedRules(event.target.checked)} />
              Я понимаю и принимаю правила
            </label>

            <div className="publish-rules-actions">
              <button type="button" onClick={() => setShowRules(false)}>Отмена</button>
              <button type="button" disabled={!acceptedRules} onClick={() => { window.location.href = '/publish'; }}>
                Продолжить
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
