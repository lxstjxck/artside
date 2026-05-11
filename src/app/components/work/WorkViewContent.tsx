'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import WorkCloseButton from '@/app/components/work/WorkCloseButton';
import type { WorkComment, WorkDetail } from '@/lib/work-catalog';

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

  const toggleSaved = async () => {
    setMessage(null);
    const response = await fetch(isSaved ? `/api/saved-works/${work.id}` : '/api/saved-works', {
      method: isSaved ? 'DELETE' : 'POST',
      headers: isSaved ? undefined : { 'Content-Type': 'application/json' },
      body: isSaved ? undefined : JSON.stringify({ id: work.id }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      setMessage(data.message ?? 'Не удалось обновить сохранение.');
      return;
    }
    setIsSaved((current) => !current);
    setSaves((current) => current + (isSaved ? -1 : 1));
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
        </div>

        <div className="work-view-stats">
          <span>{views.toLocaleString('ru-RU')} просмотров</span>
          <span>{likes.toLocaleString('ru-RU')} лайков</span>
          <span>{saves.toLocaleString('ru-RU')} сохранений</span>
          <span>{comments.length} комментариев</span>
          <span>{work.publishedAt}</span>
        </div>

        <p className="work-view-description">{work.description}</p>

        <div className="work-view-actions">
          <button type="button" className={`work-view-btn ${isLiked ? 'work-view-btn-active' : ''}`} onClick={toggleLike}>
            {isLiked ? 'Лайкнуто' : 'Лайк'}
          </button>
          <button type="button" className={`work-view-btn ${isSaved ? 'work-view-btn-active' : ''}`} onClick={toggleSaved}>
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
    </div>
  );
}
