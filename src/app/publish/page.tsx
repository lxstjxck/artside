'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { WorkDetail } from '@/lib/work-store';

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

const MAX_WORK_IMAGES = 8;
const MAX_GALLERY_IMAGES = MAX_WORK_IMAGES - 1;

type UploadResponse = {
  message?: string;
  work?: {
    id: number;
    status?: WorkDetail['status'];
  };
};

type WorkEditResponse = {
  message?: string;
  work?: WorkDetail;
  isOwner?: boolean;
};

type PublishProfileResponse = {
  authenticated: boolean;
  worksCount?: number;
  profile?: {
    publishReady?: boolean;
  };
  message?: string;
};

const isSupportedImage = (file: File) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);

export default function PublishPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const thumbInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Графический дизайн');
  const [softwareInput, setSoftwareInput] = useState('');
  const [software, setSoftware] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [editWorkId, setEditWorkId] = useState<number | null>(null);
  const [existingImagePreview, setExistingImagePreview] = useState<string | null>(null);
  const [existingThumbnailPreview, setExistingThumbnailPreview] = useState<string | null>(null);
  const [existingGalleryImages, setExistingGalleryImages] = useState<WorkDetail['images']>([]);
  const [shouldClearGallery, setShouldClearGallery] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [galleryPreviews, setGalleryPreviews] = useState<Array<{ name: string; url: string }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<WorkDetail['status']>('draft');
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
        const hasPreparedProfile = Boolean(data.profile?.publishReady);

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
    const params = new URLSearchParams(window.location.search);
    const id = Number(params.get('edit'));
    if (!Number.isInteger(id) || id <= 0) return;

    const controller = new AbortController();
    const loadWorkForEdit = async () => {
      setMessage(null);
      try {
        const response = await fetch(`/api/works/${id}`, { cache: 'no-store', signal: controller.signal });
        const data = (await response.json()) as WorkEditResponse;

        if (!response.ok || !data.work || !data.isOwner) {
          setMessage(data.message ?? 'Не удалось открыть работу для редактирования.');
          return;
        }

        setEditWorkId(data.work.id);
        setTitle(data.work.title);
        setDescription(data.work.description);
        setSelectedCategory(data.work.category);
        setTags(data.work.tags);
        setSoftware([]);
        setStatus(data.work.status);
        setExistingImagePreview(data.work.imageUrl);
        setExistingThumbnailPreview(data.work.thumbnailUrl || data.work.imageUrl);
        setExistingGalleryImages(data.work.images ?? []);
        setShouldClearGallery(false);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setMessage('Не удалось загрузить работу для редактирования.');
        }
      }
    };

    void loadWorkForEdit();
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

  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreview(null);
      return;
    }

    const url = URL.createObjectURL(thumbnailFile);
    setThumbnailPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnailFile]);

  useEffect(() => {
    const previews = galleryFiles.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));
    setGalleryPreviews(previews);

    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [galleryFiles]);

  const softwareMatches = useMemo(() => {
    const query = softwareInput.trim().toLowerCase();
    if (query.length < 2) return [];
    return softwareSuggestions.filter((item) => item.toLowerCase().includes(query) && !software.includes(item)).slice(0, 8);
  }, [software, softwareInput]);

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    if (!isSupportedImage(file)) {
      setMessage('Поддерживаются только изображения JPG, PNG и WebP.');
      return;
    }
    setImageFile(file);
    setMessage(null);
  };

  const pickThumbnail = (file: File | undefined) => {
    if (!file) return;
    if (!isSupportedImage(file)) {
      setMessage('Миниатюра должна быть изображением JPG, PNG или WebP.');
      return;
    }
    setThumbnailFile(file);
    setMessage(null);
  };

  const pickGalleryFiles = (files: FileList | null) => {
    const incoming = Array.from(files ?? []).filter(isSupportedImage);
    const unsupportedCount = (files?.length ?? 0) - incoming.length;
    setGalleryFiles((current) => {
      const freeSlots = MAX_GALLERY_IMAGES - current.length;
      const selected = incoming.slice(0, Math.max(0, freeSlots));
      const skippedCount = unsupportedCount + Math.max(0, incoming.length - selected.length);
      setMessage(
        skippedCount > 0
          ? `Часть файлов пропущена: в одной работе можно разместить до ${MAX_WORK_IMAGES} изображений, включая основное.`
          : null,
      );
      return [...current, ...selected];
    });
    setShouldClearGallery(false);
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const clearMainImage = () => {
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearThumbnail = () => {
    setThumbnailFile(null);
    if (thumbInputRef.current) thumbInputRef.current.value = '';
  };

  const removeGalleryFile = (index: number) => {
    setGalleryFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const clearGalleryFiles = () => {
    setGalleryFiles([]);
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const clearExistingGallery = () => {
    setExistingGalleryImages([]);
    setGalleryFiles([]);
    setShouldClearGallery(true);
    if (galleryInputRef.current) galleryInputRef.current.value = '';
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

    if (!editWorkId && !imageFile) {
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
      formData.set('status', nextStatus);
      if (imageFile) {
        formData.set('image', imageFile);
      }
      if (thumbnailFile) {
        formData.set('thumbnail', thumbnailFile);
      }
      if (shouldClearGallery) {
        formData.set('clearGallery', 'true');
      }
      galleryFiles.forEach((file) => formData.append('images', file));

      const response = await fetch(editWorkId ? `/api/works/${editWorkId}` : '/api/works', {
        method: editWorkId ? 'PATCH' : 'POST',
        body: formData,
      });
      const data = (await response.json()) as UploadResponse;

      if (!response.ok || !data.work) {
        setMessage(data.message ?? 'Не удалось сохранить работу.');
        return;
      }

      setStatus(data.work.status ?? (nextStatus === 'published' ? 'pending' : 'draft'));
      window.location.href = `/work/${data.work.id}`;
    } catch {
      setMessage('Сетевая ошибка при загрузке работы.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const mainPreview = imagePreview ?? existingImagePreview;
  const thumbnailBoxPreview = thumbnailPreview ?? imagePreview ?? existingThumbnailPreview ?? existingImagePreview;

  return (
    <main className="publish-page">
      <section className="publish-editor">
        <div className="publish-breadcrumbs">Управление портфолио / Создать новую работу</div>
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
            {mainPreview ? (
              <div className="publish-main-preview">
                <Image src={mainPreview} alt="Предпросмотр работы" width={1200} height={900} unoptimized />
                <div className="publish-preview-actions">
                  <button type="button" onClick={() => fileInputRef.current?.click()}>
                    Заменить изображение
                  </button>
                  {imageFile && (
                    <button type="button" onClick={clearMainImage}>
                      Удалить выбранное
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <button type="button" onClick={() => fileInputRef.current?.click()}>
                  Загрузить медиафайл
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
              placeholder="Введите используемую программу"
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
          <strong>Подсказка</strong>
          <span>В одной работе можно разместить до {MAX_WORK_IMAGES} изображений: одно основное и до {MAX_GALLERY_IMAGES} дополнительных.</span>
        </section>

        <section className="publish-side-card">
          <div className="publish-panel-title">Варианты публикации</div>
          <label>
            Статус публикации
            <select value={status === 'draft' ? 'draft' : 'published'} onChange={(event) => setStatus(event.target.value === 'published' ? 'pending' : 'draft')}>
              <option value="draft">Черновик</option>
              <option value="published">Готово к публикации</option>
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
            {thumbnailBoxPreview ? (
              <Image src={thumbnailBoxPreview} alt="Миниатюра" width={420} height={420} unoptimized />
            ) : (
              <span>Загрузите или перетащите изображение</span>
            )}
          </button>
          <div className="publish-preview-actions">
            <button type="button" onClick={() => thumbInputRef.current?.click()}>
              {thumbnailBoxPreview ? 'Заменить миниатюру' : 'Выбрать миниатюру'}
            </button>
            {thumbnailFile && (
              <button type="button" onClick={clearThumbnail}>
                Удалить выбранную
              </button>
            )}
          </div>
          <input
            ref={thumbInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => pickThumbnail(event.target.files?.[0])}
          />
        </section>

        <section className="publish-side-card">
          <div className="publish-panel-title">Дополнительные изображения</div>
          <p className="publish-upload-limit">
            {galleryFiles.length > 0
              ? `Выбрано ${galleryFiles.length} из ${MAX_GALLERY_IMAGES} дополнительных изображений. Всего в работе будет до ${galleryFiles.length + 1} из ${MAX_WORK_IMAGES}.`
              : `Можно добавить до ${MAX_GALLERY_IMAGES} дополнительных изображений. Вместе с основным - максимум ${MAX_WORK_IMAGES}.`}
          </p>
          <button type="button" onClick={() => galleryInputRef.current?.click()}>
            <span aria-hidden="true">+</span>
            Добавить галерею
          </button>
          {galleryPreviews.length > 0 && (
            <div className="publish-gallery-preview">
              {galleryPreviews.map((preview, index) => (
                <div key={`${preview.name}-${preview.url}`} className="publish-gallery-item">
                  <Image src={preview.url} alt={preview.name} width={160} height={120} unoptimized />
                  <button type="button" onClick={() => removeGalleryFile(index)} aria-label={`Удалить ${preview.name}`}>
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          )}
          {galleryFiles.length > 0 && (
            <div className="publish-preview-actions">
              <button type="button" onClick={clearGalleryFiles}>
                Очистить галерею
              </button>
            </div>
          )}
          {editWorkId && existingGalleryImages.length > 1 && galleryFiles.length === 0 && (
            <div className="publish-existing-gallery">
              <p className="publish-form-message">Сейчас в проекте {existingGalleryImages.length} изображений. Выбор новых файлов заменит галерею.</p>
              <div className="publish-gallery-preview">
                {existingGalleryImages.slice(0, 4).map((image) => (
                  <div key={image.id} className="publish-gallery-item">
                    <Image src={image.url} alt="Изображение проекта" width={160} height={120} unoptimized />
                  </div>
                ))}
              </div>
              <div className="publish-preview-actions">
                <button type="button" onClick={clearExistingGallery}>
                  Удалить галерею из работы
                </button>
              </div>
            </div>
          )}
          {shouldClearGallery && (
            <p className="publish-form-message">Галерея будет удалена после сохранения работы.</p>
          )}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={(event) => pickGalleryFiles(event.target.files)}
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
