'use client';

import { use, useEffect, useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import AccountSettingsModal from '@/app/components/AccountSettingsModal';
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

const emptyWorkForm = {
  title: '',
  category: 'Графический дизайн',
  description: '',
  tags: '',
};

export default function ProfilePage({ params }: ProfilePageProps) {
  const { username } = use(params);
  const searchParams = useSearchParams();

  const [profileUser, setProfileUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [works, setWorks] = useState<WorkSummary[]>([]);
  const [isOwner, setIsOwner] = useState(false);

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

  useEffect(() => {
    if (isOwner && searchParams.get('publish') === '1') {
      setWorkForm(emptyWorkForm);
      setWorkImage(null);
      setWorkImagePreview(null);
      setEditingWork(null);
      setPublishMessage(null);
      setIsPublishModalOpen(true);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [isOwner, searchParams]);

  useEffect(() => {
    if (!isOwner) return;

    const handleOpenPublishWork = () => {
      setWorkForm(emptyWorkForm);
      setWorkImage(null);
      setWorkImagePreview(null);
      setEditingWork(null);
      setPublishMessage(null);
      setIsPublishModalOpen(true);
    };

    window.addEventListener('artside:open-publish-work', handleOpenPublishWork);

    return () => {
      window.removeEventListener('artside:open-publish-work', handleOpenPublishWork);
    };
  }, [isOwner]);

  const featuredWorks = works.filter((work) => work.featured).slice(0, 4);
  const publishedWorks = works.filter((work) => !work.featured);
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
    resetWorkForm();
    setEditingWork(null);
    setPublishMessage(null);
    setIsPublishModalOpen(true);
  };

  const openEditWorkModal = (work: WorkSummary) => {
    setEditingWork(work);
    setWorkForm({
      title: work.title,
      category: work.category,
      description: work.description,
      tags: work.tags.join(', '),
    });
    setWorkImage(null);
    setWorkImagePreview(null);
    setPublishMessage(null);
    setIsPublishModalOpen(true);
  };

  const updateProfileField = (field: keyof UserProfile, value: string) => {
    setProfile((current) => {
      if (!current) return current;
      return {
        ...current,
        [field]: value,
      };
    });
  };

  const submitProfileChanges = async () => {
    if (!profile || !isOwner) return;

    try {
      setIsSavingProfile(true);
      setProfileMessage(null);

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

      const data = (await response.json()) as { message?: string; profile?: UserProfile };

      if (!response.ok || !data.profile) {
        setProfileMessage(data.message ?? 'Не удалось сохранить изменения профиля.');
        return;
      }

      setProfile(data.profile);
      setAvatarFile(null);
      setProfileMessage('Профиль сохранен.');
      setIsEditing(false);
    } catch {
      setProfileMessage('Сетевая ошибка при сохранении профиля.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const openSettings = () => {
    setIsSettingsOpen(true);
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

  return (
    <main className="min-h-[calc(100vh-90px)] bg-[#111111] px-4 py-4 lg:px-8 lg:py-5">
      <div className="mx-auto grid w-full max-w-[1840px] grid-cols-1 gap-6 xl:grid-cols-[408px_minmax(0,1fr)]">
        <aside className="relative rounded-[28px] bg-[linear-gradient(90deg,#ba7ea3_0%,#b694ba_35%,#8ea9d4_75%,#84b6dc_100%)] p-5 text-[#111111] shadow-soft">
          <div className="flex flex-col items-center">
            {isOwner && (
              <button
                type="button"
                onClick={openSettings}
                className="profile-settings-gear"
                aria-label="Настройки аккаунта"
                title="Настройки аккаунта"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
                  <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.04.04a2 2 0 0 1-2.83 2.83l-.04-.04A1.7 1.7 0 0 0 15 19.37a1.7 1.7 0 0 0-1 .93l-.02.05a2 2 0 0 1-3.78 0l-.02-.05a1.7 1.7 0 0 0-1-.93 1.7 1.7 0 0 0-1.88.34l-.04.04a2 2 0 0 1-2.83-2.83l.04-.04A1.7 1.7 0 0 0 4.63 15a1.7 1.7 0 0 0-.93-1l-.05-.02a2 2 0 0 1 0-3.78l.05-.02a1.7 1.7 0 0 0 .93-1 1.7 1.7 0 0 0-.34-1.88l-.04-.04a2 2 0 0 1 2.83-2.83l.04.04A1.7 1.7 0 0 0 9 4.63a1.7 1.7 0 0 0 1-.93l.02-.05a2 2 0 0 1 3.78 0l.02.05a1.7 1.7 0 0 0 1 .93 1.7 1.7 0 0 0 1.88-.34l.04-.04a2 2 0 0 1 2.83 2.83l-.04.04A1.7 1.7 0 0 0 19.37 9c.08.38.43.72.93 1l.05.02a2 2 0 0 1 0 3.78l-.05.02a1.7 1.7 0 0 0-.9 1.18Z" />
                </svg>
              </button>
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

            {isEditing ? (
              <input
                type="text"
                value={profile.nickname}
                onChange={(event) => updateProfileField('nickname', event.target.value)}
                className="mb-5 w-full rounded-xl border border-black/15 bg-white/55 px-4 py-2 text-center text-2xl font-black tracking-wide text-black outline-none"
                disabled={!isOwner || isSavingProfile}
              />
            ) : (
              <h1 className="mb-5 text-center text-[2rem] font-black tracking-wide">{profile.nickname}</h1>
            )}

            <div className="mb-5 flex w-full items-center gap-3 text-sm font-medium text-black/80">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {isEditing ? (
                <input
                  type="text"
                  value={profile.location}
                  onChange={(event) => updateProfileField('location', event.target.value)}
                  className="w-full rounded-lg border border-black/15 bg-white/55 px-3 py-2 text-sm text-black outline-none"
                  disabled={!isOwner || isSavingProfile}
                />
              ) : (
                <span>{profile.location}</span>
              )}
            </div>

            {isOwner ? (
              <div className="mb-5 grid w-full grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (isEditing) {
                      void submitProfileChanges();
                      return;
                    }
                    setIsEditing(true);
                    setProfileMessage(null);
                  }}
                  disabled={isSavingProfile}
                  className="h-12 w-full rounded-xl bg-[#111111] px-4 text-sm font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#1c1c1c] disabled:opacity-60"
                >
                  {isSavingProfile ? 'Сохраняем...' : isEditing ? 'Сохранить' : 'Редактировать'}
                </button>
              </div>
            ) : (
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.14em] text-black/70">Публичный профиль</p>
            )}

            {profileMessage && (
              <p className={`mb-4 text-sm ${profileMessage.includes('сохранен') ? 'text-emerald-800' : 'text-red-700'}`}>
                {profileMessage}
              </p>
            )}

            {isEditing && isOwner && (
              <div className="mb-5 grid w-full gap-2">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
                  className="w-full rounded-xl border border-black/15 bg-white/55 px-4 py-3 text-sm text-black outline-none"
                  disabled={isSavingProfile}
                />
                <input
                  type="text"
                  value={profile.avatarUrl}
                  onChange={(event) => updateProfileField('avatarUrl', event.target.value)}
                  placeholder="Ссылка на аватар"
                  className="w-full rounded-xl border border-black/15 bg-white/55 px-4 py-3 text-sm text-black outline-none placeholder:text-black/45"
                  disabled={isSavingProfile || Boolean(avatarFile)}
                />
              </div>
            )}

            <div className="w-full rounded-[22px] bg-white/42 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_14px_34px_rgba(0,0,0,0.12)] backdrop-blur-sm">
              {isEditing ? (
                <textarea
                  value={profile.bio}
                  onChange={(event) => updateProfileField('bio', event.target.value)}
                  className="min-h-[210px] w-full resize-none rounded-xl border border-black/10 bg-white/58 p-4 text-sm leading-6 text-black/80 outline-none"
                  disabled={!isOwner || isSavingProfile}
                />
              ) : (
                <p className="min-h-[210px] text-sm leading-6 text-black/78">{profile.bio}</p>
              )}
            </div>
          </div>
        </aside>

        <section className="">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {featuredWorks.map((work) => (
              <div key={work.id} className="profile-work-card">
                <a href={`/work/${work.id}`}>
                  <Image src={work.imageUrl} alt={work.title} width={work.imageWidth ?? 1200} height={work.imageHeight ?? 1500} unoptimized />
                  <p>{work.title}</p>
                </a>
                {isOwner && (
                  <div className="profile-work-actions">
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


          {categorySections.map((section) => (
            <div key={section.category} className="space-y-4">
              <span className="inline-flex rounded-lg bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-black">
                {section.category}
              </span>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                {section.works.map((work) => (
                  <div key={work.id} className="profile-work-card">
                    <a href={`/work/${work.id}`}>
                      <Image src={work.imageUrl} alt={work.title} width={work.imageWidth ?? 1200} height={work.imageHeight ?? 1500} unoptimized />
                      <p>{work.title}</p>
                    </a>
                    {isOwner && (
                      <div className="profile-work-actions">
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

          {works.length === 0 && (
            <div className="profile-empty-works">
              <h2>{isOwner ? 'Опубликуйте первую работу' : 'У пользователя пока нет работ'}</h2>
              <p>{isOwner ? 'Добавьте изображение, описание и теги, чтобы профиль начал выглядеть как портфолио.' : 'Когда автор добавит работы, они появятся здесь.'}</p>
              {isOwner && (
                <button type="button" onClick={openCreateWorkModal}>
                  <span aria-hidden="true">+</span>
                  Загрузить первую работу
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

      {isSettingsOpen && profileUser && (
        <AccountSettingsModal
          isOpen={isSettingsOpen}
          user={profileUser}
          onClose={() => setIsSettingsOpen(false)}
          onUserUpdate={setProfileUser}
        />
      )}
    </main>
  );
}
