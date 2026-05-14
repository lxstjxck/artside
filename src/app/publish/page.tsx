'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';

const mediaTypes = [
  { title: 'Изображения высокого качества', subtitle: 'JPG, PNG, WebP', enabled: true },
  { title: 'Видеоклип', subtitle: 'Скоро', enabled: false },
  { title: 'Видео', subtitle: 'Скоро', enabled: false },
  { title: 'Sketchfab', subtitle: 'Скоро', enabled: false },
  { title: '360 панорама', subtitle: 'Скоро', enabled: false },
];

const publishCategories = [
  'Графический дизайн',
  'Архитектура',
  'UI/UX',
  'Game art',
  'Фотография',
  '3D art',
  'Дизайн продуктов',
  'Дизайн сайтов',
  'Fan art',
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

type UploadResponse = {
  message?: string;
  work?: {
    id: number;
  };
};

type PublishProfileResponse = {
  authenticated: boolean;
  worksCount?: number;
  message?: string;
};

export default function PublishPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const thumbInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Графический дизайн');
  const [softwareInput, setSoftwareInput] = useState('');
  const [software, setSoftware] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState('Не опубликовано');
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const checkPublishAccess = async () => {
      try {
        const response = await fetch('/api/profile', { cache: 'no-store', signal: controller.signal });
        const data = (await response.json()) as PublishProfileResponse;

        if (!response.ok || !data.authenticated) {
          setMessage('Войдите в аккаунт, чтобы загрузить работу.');
          return;
        }

        const hasPublishedWorks = (data.worksCount ?? 0) > 0;
        const hasPreparedProfile = window.localStorage.getItem('artside_publish_ready') === '1';

        if (!hasPublishedWorks && !hasPreparedProfile) {
          window.location.replace('/publish/setup');
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setMessage('Не удалось проверить профиль перед публикацией.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsCheckingProfile(false);
        }
      }
    };

    void checkPublishAccess();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }

    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const softwareMatches = useMemo(() => {
    const query = softwareInput.trim().toLowerCase();
    if (query.length < 2) return [];
    return softwareSuggestions.filter((item) => item.toLowerCase().includes(query) && !software.includes(item)).slice(0, 8);
  }, [software, softwareInput]);

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage('Поддерживаются только изображения JPG, PNG и WebP.');
      return;
    }
    setImageFile(file);
    setMessage(null);
  };

  const addTag = () => {
    const value = tagInput.trim();
    if (!value) return;
    setTags((current) => current.includes(value) ? current : [...current, value].slice(0, 8));
    setTagInput('');
  };

  const addSoftware = (value = softwareInput) => {
    const prepared = value.trim();
    if (!prepared) return;
    setSoftware((current) => current.includes(prepared) ? current : [...current, prepared].slice(0, 8));
    setSoftwareInput('');
  };

  const submitWork = async (nextStatus: 'draft' | 'published') => {
    setMessage(null);

    if (!imageFile) {
      setMessage('Загрузите изображение работы.');
      return;
    }
    if (title.trim().length < 3) {
      setMessage('Название должно быть от 3 символов.');
      return;
    }
    if (description.trim().length < 20) {
      setMessage('Описание должно быть минимум 20 символов.');
      return;
    }
    if (!selectedCategory) {
      setMessage('Выберите категорию работы.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set('title', title.trim());
      formData.set('category', selectedCategory);
      formData.set('description', description.trim());
      formData.set('tags', [...tags, ...software].join(', '));
      formData.set('image', imageFile);

      const response = await fetch('/api/works', {
        method: 'POST',
        body: formData,
      });
      const data = (await response.json()) as UploadResponse;

      if (!response.ok || !data.work) {
        setMessage(data.message ?? 'Не удалось сохранить работу.');
        return;
      }

      setStatus(nextStatus === 'published' ? 'Опубликовано' : 'Черновик сохранен');
      window.location.href = `/work/${data.work.id}`;
    } catch {
      setMessage('Сетевая ошибка при загрузке работы.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="publish-page">
      <section className="publish-editor">
        <div className="publish-breadcrumbs">Управление портфелем / Создать новую работу</div>
        <h1>{title.trim() || 'Без названия'}</h1>

        <section className="publish-panel">
          <div className="publish-panel-title">Название работы</div>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Как называется ваша работа?" />
        </section>

        <section
          className={`publish-upload-zone ${isDragging ? 'publish-upload-zone-active' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            pickFile(event.dataTransfer.files[0]);
          }}
        >
          <div className="publish-media-tabs">
            {mediaTypes.map((item) => (
              <button key={item.title} type="button" disabled={!item.enabled} className={item.enabled ? 'publish-media-active' : ''}>
                <span>{item.title}</span>
                <small>{item.subtitle}</small>
              </button>
            ))}
          </div>

          <div className="publish-drop-content">
            {imagePreview ? (
              <Image src={imagePreview} alt="Предпросмотр работы" width={1200} height={900} unoptimized />
            ) : (
              <>
                <button type="button" onClick={() => fileInputRef.current?.click()}>
                  Загрузка медиафайлов
                </button>
                <span>или перетащите сюда изображение</span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => pickFile(event.target.files?.[0])}
            />
          </div>
        </section>


        <section className="publish-panel">
          <div className="publish-panel-title">Детали работы</div>
          <label>
            Описание работы
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Расскажите о задаче, процессе и результате." />
          </label>
        </section>

        <section className="publish-panel">
          <div className="publish-panel-title">Категоризация</div>
          <div className="publish-tip">
            <strong>Хотите повысить узнаваемость?</strong>
            <span>Правильная классификация помогает работе попадать в поиск, рекомендации и подборки.</span>
          </div>
          <h2>Категория</h2>
          <p>Выберите базовую категорию, которая будет использоваться на главной странице и в рекомендациях.</p>
          <div className="publish-checkbox-grid">
            {publishCategories.map((category) => (
              <label key={category}>
                <input type="checkbox" checked={selectedCategory === category} onChange={() => setSelectedCategory(category)} />
                {category}
              </label>
            ))}
          </div>
        </section>

        <section className="publish-panel">
          <h2>Используемое программное обеспечение</h2>
          <p>Укажите программы, которые использовали для создания проекта.</p>
          {software.length > 0 && (
            <div className="settings-tag-list">
              {software.map((item) => (
                <button key={item} type="button" onClick={() => setSoftware((current) => current.filter((value) => value !== item))}>
                  {item}
                  <span aria-hidden="true">x</span>
                </button>
              ))}
            </div>
          )}
          <div className="settings-suggest-field">
            <input
              value={softwareInput}
              onChange={(event) => setSoftwareInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addSoftware();
                }
              }}
              placeholder="Введите используемое программное обеспечение"
            />
            {softwareMatches.length > 0 && (
              <div className="settings-suggest-list">
                {softwareMatches.map((item) => (
                  <button key={item} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => addSoftware(item)}>
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
          <h2>Теги</h2>
          <p>Добавьте дополнительную информацию для поиска.</p>
          <div className="publish-tag-row">
            <input
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addTag();
                }
              }}
              placeholder="Например: персонаж, окружение, sci-fi"
            />
            <button type="button" onClick={addTag}>Добавить</button>
          </div>
          {tags.length > 0 && (
            <div className="settings-tag-list">
              {tags.map((item) => (
                <button key={item} type="button" onClick={() => setTags((current) => current.filter((value) => value !== item))}>
                  {item}
                  <span aria-hidden="true">x</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </section>

      <aside className="publish-sidebar">
        <section className="publish-side-card publish-side-hint">
          <strong>Знаете ли вы?</strong>
          <span>Проекты с несколькими качественными изображениями чаще попадают в рекомендации. Сейчас доступна публикация основного изображения.</span>
        </section>

        <section className="publish-side-card">
          <div className="publish-panel-title">Варианты публикации</div>
          <label>
            Статус публикации
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option>Не опубликовано</option>
              <option>Черновик</option>
              <option>Готово к публикации</option>
            </select>
          </label>
          <button type="button" onClick={() => void submitWork('draft')} disabled={isSubmitting || isCheckingProfile}>
            {isCheckingProfile ? 'Проверка...' : 'Сохранить'}
          </button>
          <button type="button" className="publish-submit-main" onClick={() => void submitWork('published')} disabled={isSubmitting || isCheckingProfile}>
            {isSubmitting ? 'Публикация...' : 'Опубликовать'}
          </button>
          {message && <p className="publish-form-message">{message}</p>}
        </section>

        <section className="publish-side-card">
          <div className="publish-panel-title">Миниатюра проекта</div>
          <button className="publish-thumb-box" type="button" onClick={() => thumbInputRef.current?.click()}>
            {thumbnailPreview || imagePreview ? (
              <Image src={thumbnailPreview ?? imagePreview ?? ''} alt="Миниатюра" width={420} height={420} unoptimized />
            ) : (
              <span>Загрузите или перетащите изображение</span>
            )}
          </button>
          <input
            ref={thumbInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const url = URL.createObjectURL(file);
              setThumbnailPreview(url);
            }}
          />
        </section>

        <section className="publish-side-card">
          <div className="publish-panel-title">Рекламный контент</div>
          <label className="publish-radio-row">
            <input type="checkbox" />
            Проект содержит рекламное размещение
          </label>
        </section>
      </aside>
    </main>
  );
}
