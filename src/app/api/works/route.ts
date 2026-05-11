import { NextResponse } from 'next/server';
import { getImageDimensions } from '@/lib/image-metadata';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getSessionUser } from '@/lib/session-user';
import { uploadWorkImage } from '@/lib/work-image-storage';
import { createWork } from '@/lib/work-store';

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

const trimString = (value: FormDataEntryValue | null) => (typeof value === 'string' ? value.trim() : '');

const parseTags = (value: string) => {
  return value.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 8);
};

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: 'Требуется авторизация.' }, { status: 401 });
  }

  const limit = checkRateLimit({
    key: `work-upload:${user.id}`,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (limit.limited) {
    return rateLimitResponse(limit.retryAfter);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: 'Некорректные данные формы.' }, { status: 400 });
  }

  const title = trimString(formData.get('title'));
  const category = trimString(formData.get('category'));
  const description = trimString(formData.get('description'));
  const tags = parseTags(trimString(formData.get('tags')));
  const image = formData.get('image');

  if (title.length < 3 || title.length > 90) {
    return NextResponse.json({ message: 'Название должно быть от 3 до 90 символов.' }, { status: 400 });
  }

  if (category.length < 2 || category.length > 40) {
    return NextResponse.json({ message: 'Категория должна быть от 2 до 40 символов.' }, { status: 400 });
  }

  if (description.length < 20 || description.length > 900) {
    return NextResponse.json({ message: 'Описание должно быть от 20 до 900 символов.' }, { status: 400 });
  }

  if (!(image instanceof File)) {
    return NextResponse.json({ message: 'Загрузите изображение работы.' }, { status: 400 });
  }

  const extension = ALLOWED_TYPES.get(image.type);
  if (!extension) {
    return NextResponse.json({ message: 'Поддерживаются изображения JPG, PNG и WebP.' }, { status: 400 });
  }

  if (image.size <= 0 || image.size > MAX_IMAGE_SIZE) {
    return NextResponse.json({ message: 'Размер изображения должен быть до 8 МБ.' }, { status: 400 });
  }

  const buffer = Buffer.from(await image.arrayBuffer());
  const dimensions = getImageDimensions(buffer);
  if (!dimensions) {
    return NextResponse.json({ message: 'Не удалось определить размеры изображения.' }, { status: 400 });
  }

  const storedImage = await uploadWorkImage({
    buffer,
    extension,
    contentType: image.type,
  });

  const work = await createWork(user.id, {
    title,
    category,
    description,
    imageUrl: storedImage.url,
    imageKey: storedImage.key,
    imageWidth: dimensions.width,
    imageHeight: dimensions.height,
    tags,
  });

  return NextResponse.json({ work }, { status: 201 });
}
