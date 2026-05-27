import type { WorkStatus } from '@/lib/work-store';

export type ModerationInput = {
  title: string;
  description: string;
  tags: string[];
  imageUrl?: string | null;
};

export type ModerationIssue = {
  field: 'title' | 'description' | 'tags' | 'image';
  message: string;
};

export type ModerationResult = {
  status: Extract<WorkStatus, 'published' | 'rejected'>;
  issues: ModerationIssue[];
};

const forbiddenWords = [
  'казино',
  'ставки',
  'букмекер',
  'наркотики',
  'порно',
  'экстремизм',
  'терроризм',
  'суицид',
  'насилие',
  'спам',
];

const normalizeText = (value: string) => value.trim().toLowerCase();

const hasForbiddenWord = (value: string) => {
  const normalized = normalizeText(value);
  return forbiddenWords.some((word) => normalized.includes(word));
};

const looksLikeJunk = (value: string) => {
  const normalized = normalizeText(value);
  if (!normalized) return true;
  if (/^(.)\1{4,}$/u.test(normalized)) return true;
  if (/(.)\1{7,}/u.test(normalized)) return true;
  if (/https?:\/\//i.test(normalized)) return true;
  return false;
};

export const moderateContent = (input: ModerationInput): ModerationResult => {
  const issues: ModerationIssue[] = [];
  const title = input.title.trim();
  const description = input.description.trim();
  const tags = input.tags.map((tag) => tag.trim()).filter(Boolean);

  if (!input.imageUrl) {
    issues.push({ field: 'image', message: 'Не загружено основное изображение работы.' });
  }

  if (title.length < 3 || looksLikeJunk(title) || hasForbiddenWord(title)) {
    issues.push({ field: 'title', message: 'Название выглядит подозрительно или содержит запрещенные слова.' });
  }

  if (description.length < 20 || looksLikeJunk(description) || hasForbiddenWord(description)) {
    issues.push({ field: 'description', message: 'Описание отсутствует, слишком короткое или содержит запрещенные слова.' });
  }

  const invalidTag = tags.find((tag) => tag.length < 2 || looksLikeJunk(tag) || hasForbiddenWord(tag));
  if (tags.length === 0 || invalidTag) {
    issues.push({ field: 'tags', message: 'Добавьте осмысленные теги без запрещенных слов.' });
  }

  return {
    status: issues.length > 0 ? 'rejected' : 'published',
    issues,
  };
};
