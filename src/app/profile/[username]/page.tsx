'use client';

import { use, useEffect, useState } from 'react';
import Image from 'next/image';
import type { AuthUser, UserProfile } from '@/lib/auth-types';
import type { WorkSummary } from '@/lib/work-store';

type ProfilePageProps = {
  params: Promise<{
    username: string;
  }>;
};

type ProfileApiResponse = {
  user: AuthUser;
  profile: UserProfile;
  works: WorkSummary[];
  isOwner: boolean;
  authenticated: boolean;
};

type WorkStatusFilter = 'all' | WorkSummary['status'];

const workStatusFilters: Array<{ id: WorkStatusFilter; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'published', label: 'Опубликованные' },
  { id: 'pending', label: 'На проверке' },
  { id: 'draft', label: 'Черновики' },
  { id: 'rejected', label: 'Отклоненные' },
];

const workStatusLabels: Record<WorkSummary['status'], string> = {
  draft: 'Черновик',
  pending: 'На проверке',
  published: 'Опубликовано',
  rejected: 'Отклонено',
};

const emptyWorkForm = {
  title: '',
  category: 'Графический дизайн',
  description: '',
  tags: '',
};

const hiringLabels: Record<string, string> = {
  fullTime: 'Полная занятость',
  contract: 'Контракт',
  freelance: 'Фриланс',
  remote: 'Удалённо',
  relocation: 'Переезд',
};

const socialLabels: Record<string, string> = {
  portfolio: 'Портфолио',
  website: 'Сайт',
  telegram: 'Telegram',
  vk: 'VK',
  dzen: 'Дзен',
  rutube: 'Rutube',
  boosty: 'Boosty',
};

export default function ProfilePage({ params }: ProfilePageProps) {
  const { username } = use(params);

  const [profileUser, setProfileUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [works, setWorks] = useState<WorkSummary[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [workStatusFilter, setWorkStatusFilter] = useState<WorkStatusFilter>('all');

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [editingWork, setEditingWork] = useState<WorkSummary | null>(null);
  const [workForm, setWorkForm] = useState(emptyWorkForm);
  const [workImage, setWorkImage] = useState<File | null>(null);
  const [workImagePreview, setWorkImagePreview] = useState<string | null>(null);
  const [isPublishingWork, setIsPublishingWork] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadProfile = async () => {
      try {
        setIsPageLoading(true);
        setPageError(null);

        const response = await fetch(`/api/profile/${encodeURIComponent(username)}`, {
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!response.ok) {
          if (response.status === 404) {
            setPageError('Профиль не найден.');
            return;
          }

          throw new Error(`Profile request failed: ${response.status}`);
        }

        const data = (await response.json()) as ProfileApiResponse;
        setProfileUser(data.user);
        setProfile(data.profile);
        setWorks(data.works ?? []);
        setIsOwner(data.isOwner);
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        setPageError('Не удалось загрузить профиль. Попробуйте обновить страницу.');
      } finally {
        if (!controller.signal.aborted) {
          setIsPageLoading(false);
        }
      }
    };

    void loadProfile();

    return () => controller.abort();
  }, [username]);

  useEffect(() => {
    if (!workImage) {
      setWorkImagePreview(null);
      return;
    }

    const url = URL.createObjectURL(workImage);
    setWorkImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [workImage]);

  const visibleWorks = isOwner
    ? works.filter((work) => workStatusFilter === 'all' || work.status === workStatusFilter)
    : works.filter((work) => work.status === 'published');
  const featuredWorks = visibleWorks.filter((work) => work.featured).slice(0, 4);
  const publishedWorks = visibleWorks.filter((work) => !work.featured);
  const categorySections = Array.from(new Set(publishedWorks.map((work) => work.category))).map((category) => ({
    category,
    works: publishedWorks.filter((work) => work.category === category),
  }));

  const closePublishModal = () => {
    if (isPublishingWork) return;
    setIsPublishModalOpen(false);
    setEditingWork(null);
    resetWorkForm();
    setPublishMessage(null);
  };

  const resetWorkForm = () => {
    setWorkForm(emptyWorkForm);
    setWorkImage(null);
    setWorkImagePreview(null);
  };

  const openCreateWorkModal = () => {
    window.location.href = '/publish';
  };

  const openEditWorkModal = (work: WorkSummary) => {
    window.location.href = `/publish?edit=${work.id}`;
  };

  const submitWork = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPublishMessage(null);

    if (!editingWork && !workImage) {
      setPublishMessage('Выберите изображение с устройства.');
      return;
    }

    try {
      setIsPublishingWork(true);
      const formData = new FormData();
      formData.set('title', workForm.title);
      formData.set('category', workForm.category);
      formData.set('description', workForm.description);
      formData.set('tags', workForm.tags);
      if (workImage) {
        formData.set('image', workImage);
      }

      const endpoint = editingWork ? `/api/works/${editingWork.id}` : '/api/works';
      const response = await fetch(endpoint, {
        method: editingWork ? 'PATCH' : 'POST',
        body: formData,
      });
      const data = (await response.json()) as { message?: string; work?: WorkSummary };

      if (!response.ok || !data.work) {
        setPublishMessage(data.message ?? 'Не удалось опубликовать работу.');
        return;
      }

      setWorks((current) => {
        if (editingWork) {
          return current.map((item) => (item.id === data.work!.id ? data.work! : item));
        }
        return [data.work!, ...current];
      });
      resetWorkForm();
      setEditingWork(null);
      setPublishMessage(null);
      setIsPublishModalOpen(false);
    } catch {
      setPublishMessage('Сетевая ошибка при публикации работы.');
    } finally {
      setIsPublishingWork(false);
    }
  };

  const deleteOwnWork = async (work: WorkSummary) => {
    const confirmed = window.confirm(`Удалить работу "${work.title}"?`);
    if (!confirmed) return;

    const response = await fetch(`/api/works/${work.id}`, { method: 'DELETE' });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      setProfileMessage(data.message ?? 'Не удалось удалить работу.');
      return;
    }

    setWorks((current) => current.filter((item) => item.id !== work.id));
    setProfileMessage('Работа удалена.');
  };

  const toggleFeaturedWork = async (work: WorkSummary) => {
    const response = await fetch(`/api/works/${work.id}/featured`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featured: !work.featured }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string; work?: { id: number; featured: boolean } };
    if (!response.ok || !data.work) {
      setProfileMessage(data.message ?? 'Не удалось обновить закрепление.');
      return;
    }

    setWorks((current) => current.map((item) => (
      item.id === work.id ? { ...item, featured: data.work!.featured } : item
    )));
  };

  const publishDraftWork = async (work: WorkSummary) => {
    const formData = new FormData();
    formData.set('title', work.title);
    formData.set('category', work.category);
    formData.set('description', work.description);
    formData.set('tags', work.tags.join(', '));
    formData.set('status', 'published');

    const response = await fetch(`/api/works/${work.id}`, {
      method: 'PATCH',
      body: formData,
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string; work?: WorkSummary };
    if (!response.ok || !data.work) {
      setProfileMessage(data.message ?? 'Не удалось опубликовать черновик.');
      return;
    }

    setWorks((current) => current.map((item) => (item.id === work.id ? data.work! : item)));
    setProfileMessage('Работа отправлена на модерацию.');
  };

  const moderateOwnWork = async (work: WorkSummary) => {
    const response = await fetch(`/api/works/${work.id}/moderate`, { method: 'POST' });
    const data = (await response.json().catch(() => ({}))) as {
      message?: string;
      status?: WorkSummary['status'];
      issues?: Array<{ message: string }>;
    };
    if (!response.ok || !data.status) {
      setProfileMessage(data.message ?? 'Не удалось выполнить проверку работы.');
      return;
    }

    setWorks((current) => current.map((item) => (item.id === work.id ? { ...item, status: data.status! } : item)));
    const issueText = data.issues?.map((issue) => issue.message).join(' ');
    setProfileMessage(issueText ? `${data.message} ${issueText}` : data.message ?? 'Проверка завершена.');
  };

  if (isPageLoading) {
    return (
      <main className="min-h-[calc(100vh-90px)] bg-[#111111] px-4 py-8 lg:px-8">
        <p className="text-sm text-white/75">Загрузка профиля...</p>
      </main>
    );
  }

  if (pageError || !profile || !profileUser) {
    return (
      <main className="min-h-[calc(100vh-90px)] bg-[#111111] px-4 py-8 lg:px-8">
        <p className="text-sm text-red-300">{pageError ?? 'Профиль недоступен.'}</p>
      </main>
    );
  }

  const professionalSkills = profile.professionalSkills.filter(Boolean);
  const professionalSoftware = profile.professionalSoftware.filter(Boolean);
  const hiringTypes = profile.hiringTypes.filter(Boolean);
  const socialLinks = Object.entries(profile.socialLinks ?? {}).filter(([key, url]) => Boolean(url) && Boolean(socialLabels[key]));
  const visiblePublicEmail = profile.showPublicEmail && profile.publicEmail.trim() ? profile.publicEmail.trim() : '';
  const hasProfessionalProfile = professionalSkills.length > 0
    || professionalSoftware.length > 0
    || hiringTypes.length > 0
    || Boolean(visiblePublicEmail)
    || socialLinks.length > 0;

  return (
    <main className="min-h-[calc(100vh-90px)] bg-[#111111] px-4 py-4 lg:px-8 lg:py-5">
      <div className="mx-auto grid w-full max-w-[1840px] grid-cols-1 gap-6 xl:grid-cols-[408px_minmax(0,1fr)]">
        <aside className="relative rounded-[28px] bg-[linear-gradient(90deg,#ba7ea3_0%,#b694ba_35%,#8ea9d4_75%,#84b6dc_100%)] p-5 text-[#111111] shadow-soft">
          <div className="flex flex-col items-center">
            {isOwner && (
              <a
                href="/settings"
                className="profile-settings-gear"
                aria-label="Настройки аккаунта"
                title="Настройки аккаунта"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
                  <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.04.04a2 2 0 0 1-2.83 2.83l-.04-.04A1.7 1.7 0 0 0 15 19.37a1.7 1.7 0 0 0-1 .93l-.02.05a2 2 0 0 1-3.78 0l-.02-.05a1.7 1.7 0 0 0-1-.93 1.7 1.7 0 0 0-1.88.34l-.04.04a2 2 0 0 1-2.83-2.83l.04-.04A1.7 1.7 0 0 0 4.63 15a1.7 1.7 0 0 0-.93-1l-.05-.02a2 2 0 0 1 0-3.78l.05-.02a1.7 1.7 0 0 0 .93-1 1.7 1.7 0 0 0-.34-1.88l-.04-.04a2 2 0 0 1 2.83-2.83l.04.04A1.7 1.7 0 0 0 9 4.63a1.7 1.7 0 0 0 1-.93l.02-.05a2 2 0 0 1 3.78 0l.02.05a1.7 1.7 0 0 0 1 .93 1.7 1.7 0 0 0 1.88-.34l.04-.04a2 2 0 0 1 2.83 2.83l-.04.04A1.7 1.7 0 0 0 19.37 9c.08.38.43.72.93 1l.05.02a2 2 0 0 1 0 3.78l-.05.02a1.7 1.7 0 0 0-.9 1.18Z" />
                </svg>
              </a>
            )}

            <div className="mb-5 flex h-40 w-40 items-center justify-center overflow-hidden rounded-full bg-[#111111]">
              {profile.avatarUrl ? (
                <Image src={profile.avatarUrl} alt="Аватар профиля" width={160} height={160} unoptimized className="h-full w-full object-cover" />
              ) : (
                <svg width="62" height="62" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6">
                  <circle cx="12" cy="8" r="4.2" />
                  <path d="M5 20c1.3-3.2 4.1-4.8 7-4.8s5.7 1.6 7 4.8" />
                </svg>
              )}
            </div>

            <h1 className="mb-5 text-center text-[2rem] font-black tracking-wide">{profile.nickname}</h1>

            <div className="mb-5 flex w-full items-center gap-3 text-sm font-medium text-black/80">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{profile.location}</span>
            </div>

            {!isOwner && (
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.14em] text-black/70">Публичный профиль</p>
            )}

            {profileMessage && (
              <p className={`mb-4 text-sm ${profileMessage.includes('сохранен') ? 'text-emerald-800' : 'text-red-700'}`}>
                {profileMessage}
              </p>
            )}

            <div className="profile-bio-card w-full min-w-0 overflow-hidden rounded-[22px] bg-white/42 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_14px_34px_rgba(0,0,0,0.12)] backdrop-blur-sm">
              <p
                className="min-h-[210px] max-w-full break-all text-sm leading-6 text-black/78"
                style={{ overflowWrap: 'anywhere', wordBreak: 'break-all' }}
              >
                {profile.bio}
              </p>
            </div>

            {hasProfessionalProfile && (
              <div className="profile-professional-card">
                <div className="profile-professional-head">
                  <span>Профессиональный профиль</span>
                </div>

                {professionalSkills.length > 0 && (
                  <section className="profile-professional-section">
                    <h2>Навыки</h2>
                    <div className="profile-professional-tags">
                      {professionalSkills.map((skill) => (
                        <span key={skill}>{skill}</span>
                      ))}
                    </div>
                  </section>
                )}

                {professionalSoftware.length > 0 && (
                  <section className="profile-professional-section">
                    <h2>Программы</h2>
                    <div className="profile-professional-tags profile-professional-tags-soft">
                      {professionalSoftware.map((item) => (
                        <span key={item}>{item}</span>
                      ))}
                    </div>
                  </section>
                )}

                {hiringTypes.length > 0 && (
                  <section className="profile-professional-section">
                    <h2>Формат работы</h2>
                    <div className="profile-professional-tags">
                      {hiringTypes.map((type) => (
                        <span key={type}>{hiringLabels[type] ?? type}</span>
                      ))}
                    </div>
                  </section>
                )}

                {visiblePublicEmail && (
                  <section className="profile-professional-section">
                    <h2>Контакт</h2>
                    <a className="profile-professional-email" href={`mailto:${visiblePublicEmail}`}>
                      {visiblePublicEmail}
                    </a>
                  </section>
                )}

                {socialLinks.length > 0 && (
                  <section className="profile-professional-section">
                    <h2>Ссылки</h2>
                    <div className="profile-professional-links">
                      {socialLinks.map(([key, url]) => (
                        <a key={key} href={url} target="_blank" rel="noreferrer">
                          {socialLabels[key] ?? key}
                        </a>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        </aside>

        <section className="profile-workspace">
          {isOwner && (
            <div className="profile-work-filters" aria-label="Фильтр работ по статусу">
              {workStatusFilters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={workStatusFilter === filter.id ? 'profile-work-filter-active' : ''}
                  onClick={() => setWorkStatusFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          )}

          {featuredWorks.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {featuredWorks.map((work) => (
              <div key={work.id} className="profile-work-card">
                <a href={`/work/${work.id}`}>
                  <Image
                    src={work.thumbnailUrl || work.imageUrl}
                    alt={work.title}
                    width={work.thumbnailWidth ?? work.imageWidth ?? 1200}
                    height={work.thumbnailHeight ?? work.imageHeight ?? 1500}
                    unoptimized
                  />
                  {work.status !== 'published' && <span className="profile-work-status">{workStatusLabels[work.status]}</span>}
                  <p>{work.title}</p>
                </a>
                {isOwner && (
                  <div className="profile-work-actions">
                    {work.status === 'draft' && (
                      <button type="button" className="profile-work-publish-action" onClick={() => void publishDraftWork(work)}>
                        Отправить на проверку
                      </button>
                    )}
                    {work.status === 'pending' && (
                      <button type="button" className="profile-work-publish-action" onClick={() => void moderateOwnWork(work)}>
                        Проверить
                      </button>
                    )}
                    {work.status === 'rejected' && (
                      <button type="button" className="profile-work-publish-action" onClick={() => void moderateOwnWork(work)}>
                        Повторить проверку
                      </button>
                    )}
                    <button type="button" onClick={() => void toggleFeaturedWork(work)}>
                      {work.featured ? 'Открепить' : 'Закрепить'}
                    </button>
                    <button type="button" onClick={() => openEditWorkModal(work)}>Редактировать</button>
                    <button type="button" onClick={() => void deleteOwnWork(work)}>Удалить</button>
                  </div>
                )}
              </div>
            ))}
          </div>
          )}


          {categorySections.map((section) => (
            <div key={section.category} className="profile-work-section">
              <span className="profile-work-category">
                {section.category}
              </span>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                {section.works.map((work) => (
                  <div key={work.id} className="profile-work-card">
                    <a href={`/work/${work.id}`}>
                      <Image
                        src={work.thumbnailUrl || work.imageUrl}
                        alt={work.title}
                        width={work.thumbnailWidth ?? work.imageWidth ?? 1200}
                        height={work.thumbnailHeight ?? work.imageHeight ?? 1500}
                        unoptimized
                      />
                      {work.status !== 'published' && <span className="profile-work-status">{workStatusLabels[work.status]}</span>}
                      <p>{work.title}</p>
                    </a>
                    {isOwner && (
                      <div className="profile-work-actions">
                        {work.status === 'draft' && (
                          <button type="button" className="profile-work-publish-action" onClick={() => void publishDraftWork(work)}>
                            Отправить на проверку
                          </button>
                        )}
                        {work.status === 'pending' && (
                          <button type="button" className="profile-work-publish-action" onClick={() => void moderateOwnWork(work)}>
                            Проверить
                          </button>
                        )}
                        {work.status === 'rejected' && (
                          <button type="button" className="profile-work-publish-action" onClick={() => void moderateOwnWork(work)}>
                            Повторить проверку
                          </button>
                        )}
                        <button type="button" onClick={() => void toggleFeaturedWork(work)}>
                          {work.featured ? 'Открепить' : 'Закрепить'}
                        </button>
                        <button type="button" onClick={() => openEditWorkModal(work)}>Редактировать</button>
                        <button type="button" onClick={() => void deleteOwnWork(work)}>Удалить</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {visibleWorks.length === 0 && (
            <div className="profile-empty-works">
              <h2>{works.length === 0 ? (isOwner ? 'Опубликуйте первую работу' : 'У пользователя пока нет работ') : 'В этом фильтре нет работ'}</h2>
              <p>{works.length === 0 ? (isOwner ? 'Добавьте изображение, описание и теги, чтобы профиль начал выглядеть как портфолио.' : 'Когда автор добавит работы, они появятся здесь.') : 'Переключите фильтр статуса, чтобы увидеть другие работы.'}</p>
              {isOwner && (
                <button type="button" onClick={openCreateWorkModal}>
                  <span aria-hidden="true">+</span>
                  Загрузить работу
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      {isPublishModalOpen && (
        <div className="publish-modal-overlay" onClick={closePublishModal}>
          <form className="publish-modal" onSubmit={submitWork} onClick={(event) => event.stopPropagation()}>
            <div className="publish-work-head">
              <h2>{editingWork ? 'Редактировать работу' : 'Новая работа'}</h2>
              <button type="button" onClick={closePublishModal} disabled={isPublishingWork} aria-label="Закрыть форму">
                ×
              </button>
            </div>

            <label className="upload-dropzone">
              {workImagePreview ? (
                <span className="upload-preview" style={{ backgroundImage: `url(${workImagePreview})` }} />
              ) : editingWork ? (
                <span className="upload-preview" style={{ backgroundImage: `url(${editingWork.imageUrl})` }} />
              ) : (
                <span>Выберите изображение</span>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => setWorkImage(event.target.files?.[0] ?? null)}
                required={!editingWork}
              />
            </label>

            <div className="publish-work-grid">
              <input value={workForm.title} onChange={(event) => setWorkForm((current) => ({ ...current, title: event.target.value }))} placeholder="Название" required />
              <input value={workForm.category} onChange={(event) => setWorkForm((current) => ({ ...current, category: event.target.value }))} placeholder="Категория" required />
              <input value={workForm.tags} onChange={(event) => setWorkForm((current) => ({ ...current, tags: event.target.value }))} placeholder="Теги через запятую" />
            </div>
            <textarea value={workForm.description} onChange={(event) => setWorkForm((current) => ({ ...current, description: event.target.value }))} placeholder="Описание работы" required />

            {publishMessage && <p className="text-sm text-red-200">{publishMessage}</p>}

            <button className="publish-submit-btn" type="submit" disabled={isPublishingWork}>
              {isPublishingWork ? 'Сохранение...' : editingWork ? 'Сохранить изменения' : 'Опубликовать'}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
