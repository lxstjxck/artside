'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { LibraryFolderItem, SavedWorkItem } from '@/lib/saved-work-types';

type LibraryResponse = {
  authenticated: boolean;
  folders: LibraryFolderItem[];
  items: SavedWorkItem[];
};

export default function LibraryPage() {
  const [folders, setFolders] = useState<LibraryFolderItem[]>([]);
  const [items, setItems] = useState<SavedWorkItem[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null);
  const [draggedFolderId, setDraggedFolderId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const activeFolder = useMemo(
    () => folders.find((folder) => folder.id === activeFolderId) ?? folders[0],
    [activeFolderId, folders]
  );

  useEffect(() => {
    let cancelled = false;

    const loadLibrary = async () => {
      setIsLoading(true);
      setMessage(null);
      const query = activeFolderId ? `?folderId=${activeFolderId}` : '';
      const response = await fetch(`/api/library${query}`, { cache: 'no-store' });
      const data = (await response.json()) as LibraryResponse;

      if (cancelled) return;

      if (!data.authenticated) {
        setFolders([]);
        setItems([]);
        setMessage('Войдите, чтобы открыть библиотеку.');
        setIsLoading(false);
        return;
      }

      const nextFolders = data.folders ?? [];
      setFolders(nextFolders);

      if (!activeFolderId && nextFolders.length > 0) {
        setActiveFolderId(nextFolders[0].id);
        return;
      }

      if (activeFolderId && nextFolders.length > 0 && !nextFolders.some((folder) => folder.id === activeFolderId)) {
        setActiveFolderId(nextFolders[0].id);
        return;
      }

      setItems(data.items ?? []);
      setIsLoading(false);
    };

    void loadLibrary();

    return () => {
      cancelled = true;
    };
  }, [activeFolderId]);

  const createFolder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isCreatingFolder) return;

    setIsCreatingFolder(true);
    setMessage(null);

    const response = await fetch('/api/library/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: folderName }),
    });
    const data = (await response.json()) as { folders?: LibraryFolderItem[]; message?: string };

    if (!response.ok) {
      setMessage(data.message ?? 'Не удалось создать папку.');
      setIsCreatingFolder(false);
      return;
    }

    const nextFolders = data.folders ?? [];
    const createdFolder = nextFolders.find((folder) => folder.name.toLowerCase() === folderName.trim().toLowerCase());
    setFolders(nextFolders);
    setFolderName('');
    setIsCreatingFolder(false);
    setActiveFolderId(createdFolder?.id ?? nextFolders[0]?.id ?? null);
  };

  const deleteFolder = async (folder: LibraryFolderItem) => {
    if (folder.name === 'Избранное') {
      setMessage('Папку «Избранное» нельзя удалить.');
      return;
    }

    const response = await fetch('/api/library/folders', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId: folder.id }),
    });
    const data = (await response.json()) as { folders?: LibraryFolderItem[]; message?: string };

    if (!response.ok) {
      setMessage(data.message ?? 'Не удалось удалить папку.');
      return;
    }

    const nextFolders = data.folders ?? [];
    setFolders(nextFolders);
    if (activeFolderId === folder.id) {
      setActiveFolderId(nextFolders[0]?.id ?? null);
    }
  };

  const persistFolderOrder = async (nextFolders: LibraryFolderItem[]) => {
    const response = await fetch('/api/library/folders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderIds: nextFolders.map((folder) => folder.id) }),
    });
    const data = (await response.json()) as { folders?: LibraryFolderItem[]; message?: string };
    if (!response.ok) {
      setMessage(data.message ?? 'Не удалось сохранить порядок папок.');
      return;
    }
    setFolders(data.folders ?? nextFolders);
  };

  const moveFolder = (targetFolderId: number) => {
    if (!draggedFolderId || draggedFolderId === targetFolderId) return;

    setFolders((current) => {
      const fromIndex = current.findIndex((folder) => folder.id === draggedFolderId);
      const toIndex = current.findIndex((folder) => folder.id === targetFolderId);
      if (fromIndex < 0 || toIndex < 0) return current;

      const nextFolders = [...current];
      const [movedFolder] = nextFolders.splice(fromIndex, 1);
      nextFolders.splice(toIndex, 0, movedFolder);
      void persistFolderOrder(nextFolders);
      return nextFolders;
    });
  };

  const moveItemToFolder = async (workId: number, folderId: number) => {
    const currentFolderId = activeFolder?.id ?? null;
    const response = await fetch(`/api/saved-works/${workId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId }),
    });

    if (!response.ok) {
      setMessage('Не удалось переместить работу.');
      return;
    }

    setItems((current) => (
      currentFolderId && currentFolderId !== folderId
        ? current.filter((item) => item.id !== workId)
        : current.map((item) => (item.id === workId ? { ...item, folderId } : item))
    ));
    setFolders((current) => current.map((folder) => {
      if (folder.id === currentFolderId && folder.id !== folderId) {
        return { ...folder, count: Math.max(0, folder.count - 1) };
      }
      if (folder.id === folderId && folder.id !== currentFolderId) {
        return { ...folder, count: folder.count + 1 };
      }
      return folder;
    }));
  };

  return (
    <main className="library-page">
      <aside className="library-sidebar">
        <div className="library-title">Моя библиотека</div>

        <form className="library-folder-form" onSubmit={createFolder}>
          <input
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
            placeholder="Название папки"
            maxLength={40}
          />
          <button type="submit" disabled={isCreatingFolder}>
            <span aria-hidden="true">+</span>
            Создать папку
          </button>
        </form>

        <div className="library-folders">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className={`library-folder-item ${folder.id === activeFolder?.id ? 'library-folder-active' : ''} ${folder.id === draggedFolderId ? 'library-folder-dragging' : ''}`}
              draggable
              onDragStart={() => setDraggedFolderId(folder.id)}
              onDragOver={(event) => {
                event.preventDefault();
                moveFolder(folder.id);
              }}
              onDragEnd={() => setDraggedFolderId(null)}
            >
              <button
                type="button"
                onClick={() => setActiveFolderId(folder.id)}
                className="library-folder-main"
              >
                <span className="library-folder-icon" aria-hidden="true" />
                <strong>{folder.name}</strong>
                <small>{folder.count} работ</small>
              </button>
              {folder.name !== 'Избранное' && (
                <button
                  type="button"
                  className="library-folder-delete"
                  onClick={() => void deleteFolder(folder)}
                  aria-label={`Удалить папку ${folder.name}`}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="library-tip">
          Перетащите папки мышкой, чтобы изменить порядок. При удалении папки ее работы вернутся в «Избранное».
        </div>
      </aside>

      <section className="library-content">
        <div className="library-content-head">
          <div>
            <span className="library-head-folder" aria-hidden="true" />
            <h1>{activeFolder?.name ?? 'Избранное'}</h1>
          </div>
          <span>{items.length} работ</span>
        </div>

        {message && <p className="library-message">{message}</p>}

        {isLoading ? (
          <p className="library-empty">Загрузка библиотеки...</p>
        ) : items.length === 0 ? (
          <div className="library-empty">
            <h2>В этой папке пока пусто.</h2>
            <p>Сохраненные работы появятся здесь.</p>
          </div>
        ) : (
          <div className="library-grid">
            {items.map((item) => (
              <article key={item.id} className="library-card">
                <Link href={`/work/${item.id}`}>
                  {item.imageUrl && item.title && (
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      width={item.imageWidth ?? 1200}
                      height={item.imageHeight ?? 1500}
                      unoptimized
                    />
                  )}
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.author}</span>
                  </div>
                </Link>
                <select
                  value={item.folderId ?? activeFolder?.id ?? ''}
                  onChange={(event) => void moveItemToFolder(item.id, Number(event.target.value))}
                  aria-label="Переместить работу в папку"
                >
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
