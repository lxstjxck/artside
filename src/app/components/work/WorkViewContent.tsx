import Image from 'next/image';
import WorkCloseButton from '@/app/components/work/WorkCloseButton';
import type { WorkDetail } from '@/lib/work-catalog';

type WorkViewContentProps = {
  work: WorkDetail;
  closeHref?: string;
};

export default function WorkViewContent({ work, closeHref = '/' }: WorkViewContentProps) {
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
          <span>{work.views.toLocaleString('ru-RU')} просмотров</span>
          <span>{work.likes.toLocaleString('ru-RU')} лайков</span>
          <span>{work.comments.length} комментария</span>
          <span>{work.publishedAt}</span>
        </div>

        <p className="work-view-description">{work.description}</p>

        <div className="work-view-actions">
          <button type="button" className="work-view-btn">Лайк</button>
          <button type="button" className="work-view-btn">Сохранить</button>
          <button type="button" className="work-view-btn">Поделиться</button>
        </div>

        <div className="work-view-tags">
          {work.tags.map((tag) => (
            <span key={tag} className="work-view-tag">#{tag}</span>
          ))}
        </div>

        <div className="work-view-comments">
          <h3 className="work-view-comments-title">Комментарии</h3>
          {work.comments.map((comment) => (
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
