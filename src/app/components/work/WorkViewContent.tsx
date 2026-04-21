import type { WorkDetail } from '@/lib/work-catalog';

type WorkViewContentProps = {
  work: WorkDetail;
};

export default function WorkViewContent({ work }: WorkViewContentProps) {
  return (
    <div className="work-view-shell">
      <div className="work-view-media-wrap">
        <div className="work-view-media" style={{ aspectRatio: work.aspectRatio }} />
      </div>

      <aside className="work-view-side">
        <div className="work-view-top">
          <p className="work-view-kind">{work.kind === 'popular' ? 'Популярное' : 'Рекомендация'}</p>
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
