'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import WorkCloseButton from '@/app/components/work/WorkCloseButton';
import type { WorkComment, WorkDetail } from '@/lib/work-catalog';
import type { LibraryFolderItem, SavedWorkItem } from '@/lib/saved-work-types';

type WorkViewContentProps = {
  work: WorkDetail;
  closeHref?: string;
};

export default function WorkViewContent({ work, closeHref = '/' }: WorkViewContentProps) {
  const [views, setViews] = useState(work.views);
  const [likes, setLikes] = useState(work.likes);
  const [saves, setSaves] = useState(work.saves);
  const [isLiked, setIsLiked] = useState(work.likedByMe);
  const [isSaved, setIsSaved] = useState(work.savedByMe);
  const [comments, setComments] = useState<WorkComment[]>(work.comments);
  const [commentText, setCommentText] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [libraryFolders, setLibraryFolders] = useState<LibraryFolderItem[]>([]);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [collectionSearch, setCollectionSearch] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);

  const filteredFolders = useMemo(() => (
    libraryFolders.filter((folder) => folder.name.toLowerCase().includes(collectionSearch.trim().toLowerCase()))
  ), [collectionSearch, libraryFolders]);

  useEffect(() => {
    const markViewed = async () => {
      const response = await fetch(`/api/works/${work.id}/view`, { method: 'POST' });
      if (!response.ok) return;
      const data = (await response.json()) as { views?: number };
      if (typeof data.views === 'number') {
        setViews(data.views);
      }
    };

    void markViewed();
  }, [work.id]);

  const toggleLike = async () => {
    setMessage(null);
    const response = await fetch(`/api/works/${work.id}/like`, { method: isLiked ? 'DELETE' : 'POST' });
    const data = (await response.json().catch(() => ({}))) as { message?: string; liked?: boolean; likes?: number };
    if (!response.ok) {
      setMessage(data.message ?? 'Не удалось обновить лайк.');
      return;
    }
    setIsLiked(Boolean(data.liked));
    if (typeof data.likes === 'number') setLikes(data.likes);
  };

  const loadLibraryFolders = async () => {
    setIsLibraryLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/library', { cache: 'no-store' });
      const data = (await response.json()) as { authenticated: boolean; folders?: LibraryFolderItem[]; message?: string };

      if (!response.ok || !data.authenticated) {
        throw new Error(data.message ?? 'Войдите в аккаунт, чтобы сохранять работы.');
      }

      setLibraryFolders(data.folders ?? []);
    } catch (error) {
      setMessage((error as Error).message || 'Не удалось загрузить папки библиотеки.');
    } finally {
      setIsLibraryLoading(false);
    }
  };

  const openSaveModal = () => {
    setCollectionSearch('');
    setNewCollectionName('');
    setIsSaveModalOpen(true);
    void loadLibraryFolders();
  };

  const closeSaveModal = () => {
    setIsSaveModalOpen(false);
    setCollectionSearch('');
    setNewCollectionName('');
    setIsCreatingCollection(false);
  };

  const removeSavedWork = async () => {
    setMessage(null);
    const response = await fetch(`/api/saved-works/${work.id}`, { method: 'DELETE' });
    const data = (await response.json().catch(() => ({}))) as { message?: string };

    if (!response.ok) {
      setMessage(data.message ?? 'Не удалось удалить работу из библиотеки.');
      return;
    }

    setIsSaved(false);
    setSaves((current) => Math.max(0, current - 1));
    closeSaveModal();
    setMessage('Работа удалена из библиотеки.');
  };

  const toggleSavedWork = () => {
    if (isSaved) {
      void removeSavedWork();
      return;
    }

    openSaveModal();
  };

  const saveWorkToFolder = async (folderId: number) => {
    setMessage(null);
    const response = await fetch('/api/saved-works', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: work.id, folderId }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string; items?: SavedWorkItem[] };
    if (!response.ok || !data.items) {
      setMessage(data.message ?? 'Не удалось сохранить работу.');
      return;
    }

    if (!isSaved) {
      setSaves((current) => current + 1);
    }
    setIsSaved(true);
    closeSaveModal();
    setMessage('Работа сохранена в библиотеку.');
  };

  const createCollection = async () => {
    if (!newCollectionName.trim() || isCreatingCollection) return;

    setIsCreatingCollection(true);
    setMessage(null);

    try {
      const response = await fetch('/api/library/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCollectionName }),
      });
      const data = (await response.json()) as { folders?: LibraryFolderItem[]; message?: string };

      if (!response.ok || !data.folders) {
        throw new Error(data.message ?? 'Не удалось создать папку.');
      }

      setLibraryFolders(data.folders);
      setCollectionSearch('');
      setNewCollectionName('');
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setIsCreatingCollection(false);
    }
  };

  const submitComment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    const text = commentText.trim();
    if (!text) return;

    const response = await fetch(`/api/works/${work.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string; comment?: WorkComment };
    if (!response.ok || !data.comment) {
      setMessage(data.message ?? 'Не удалось добавить комментарий.');
      return;
    }

    setComments((current) => [data.comment!, ...current]);
    setCommentText('');
  };

  return (
    <div className="work-view-shell">
      <WorkCloseButton fallbackHref={closeHref} />
      <div className="work-view-media-wrap">
        <div className="work-view-media">
          <Image src={work.imageUrl} alt={work.title} width={work.imageWidth ?? 1200} height={work.imageHeight ?? 1500} unoptimized />
        </div>
      </div>

      <aside className="work-view-side">
        <div className="work-view-top">
          <p className="work-view-kind">{work.category}</p>
          <h2 className="work-view-title">{work.title}</h2>
          <p className="work-view-author">Автор: {work.author}</p>
          <div className="work-view-meta">
            <span>{work.imageWidth}x{work.imageHeight}</span>
            <span>{work.publishedAt}</span>
          </div>
        </div>

        <div className="work-view-stats">
          <span>{views.toLocaleString('ru-RU')} просмотров</span>
          <span>{likes.toLocaleString('ru-RU')} лайков</span>
          <span>{saves.toLocaleString('ru-RU')} сохранений</span>
          <span>{comments.length} комментариев</span>
        </div>

        <p className="work-view-description">{work.description}</p>

        <div className="work-view-actions">
          <button type="button" className={`work-view-btn ${isLiked ? 'work-view-btn-active' : ''}`} onClick={toggleLike}>
            {isLiked ? 'Лайкнуто' : 'Лайк'}
          </button>
          <button type="button" className={`work-view-btn ${isSaved ? 'work-view-btn-active' : ''}`} onClick={toggleSavedWork}>
            {isSaved ? 'Сохранено' : 'Сохранить'}
          </button>
          <button type="button" className="work-view-btn" onClick={() => navigator.clipboard?.writeText(window.location.href)}>
            Поделиться
          </button>
        </div>

        {message && <p className="text-sm text-red-300">{message}</p>}

        <div className="work-view-tags">
          {work.tags.map((tag) => (
            <span key={tag} className="work-view-tag">#{tag}</span>
          ))}
        </div>

        <div className="work-view-comments">
          <h3 className="work-view-comments-title">Комментарии</h3>
          <form className="work-comment-form" onSubmit={submitComment}>
            <textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Добавить комментарий" />
            <button type="submit">Отправить</button>
          </form>
          {comments.map((comment) => (
            <div key={comment.id} className="work-view-comment">
              <div className="work-view-comment-head">
                <span className="work-view-comment-author">{comment.author}</span>
                <span className="work-view-comment-time">{comment.postedAt}</span>
              </div>
              <p className="work-view-comment-text">{comment.text}</p>
            </div>
          ))}
        </div>
      </aside>

      {isSaveModalOpen && (
        <div className="collection-modal-overlay" onClick={closeSaveModal}>
          <div className="collection-modal" onClick={(event) => event.stopPropagation()}>
            <div className="collection-modal-head">
              <h2>Добавить работу в коллекцию</h2>
              <button type="button" onClick={closeSaveModal} aria-label="Закрыть">
                ×
              </button>
            </div>

            <div className="collection-create-row">
              <input
                value={newCollectionName}
                onChange={(event) => setNewCollectionName(event.target.value)}
                placeholder="Название новой папки"
                maxLength={40}
              />
              <button type="button" onClick={createCollection} disabled={isCreatingCollection || !newCollectionName.trim()}>
                <span aria-hidden="true">+</span>
                Создать
              </button>
            </div>

            <label className="collection-search">
              <span aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m21 21-4.3-4.3" />
                  <circle cx="11" cy="11" r="7" />
                </svg>
              </span>
              <input
                value={collectionSearch}
                onChange={(event) => setCollectionSearch(event.target.value)}
                placeholder="Поиск папок..."
              />
            </label>

            {message && <p className="collection-modal-error">{message}</p>}

            <div className="collection-list">
              {isLibraryLoading ? (
                <p className="collection-empty">Загрузка папок...</p>
              ) : filteredFolders.length === 0 ? (
                <p className="collection-empty">Папок пока нет. Создайте новую выше.</p>
              ) : (
                filteredFolders.filter((folder) => !folder.system).map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => void saveWorkToFolder(folder.id)}
                  >
                    <span className="collection-folder-icon" aria-hidden="true" />
                    <span>
                      <strong>{folder.name}</strong>
                      <small>{folder.count} работ</small>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
