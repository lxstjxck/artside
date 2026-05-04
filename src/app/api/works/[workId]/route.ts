import { NextResponse } from 'next/server';
import { getImageDimensions } from '@/lib/image-metadata';
import { getSessionUser } from '@/lib/session-user';
import { deleteWorkImage, uploadWorkImage } from '@/lib/work-image-storage';
import { deleteWork, getWorkOwnerInfo, updateWork } from '@/lib/work-store';

type RouteParams = {
  params: Promise<{
    workId: string;
  }>;
};

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

const trimString = (value: FormDataEntryValue | null) => (typeof value === 'string' ? value.trim() : '');
const parseTags = (value: string) => value.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 8);

const parseWorkId = (value: string) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: 'Требуется авторизация.' }, { status: 401 });
  }

  const { workId } = await params;
  const id = parseWorkId(workId);
  if (!id) {
    return NextResponse.json({ message: 'Некорректный идентификатор работы.' }, { status: 400 });
  }

  const existing = await getWorkOwnerInfo(id);
  if (!existing) {
    return NextResponse.json({ message: 'Работа не найдена.' }, { status: 404 });
  }
  if (existing.authorId !== user.id) {
    return NextResponse.json({ message: 'Можно редактировать только свои работы.' }, { status: 403 });
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

  if (title.length < 3 || title.length > 90) {
    return NextResponse.json({ message: 'Название должно быть от 3 до 90 символов.' }, { status: 400 });
  }
  if (category.length < 2 || category.length > 40) {
    return NextResponse.json({ message: 'Категория должна быть от 2 до 40 символов.' }, { status: 400 });
  }
  if (description.length < 20 || description.length > 900) {
    return NextResponse.json({ message: 'Описание должно быть от 20 до 900 символов.' }, { status: 400 });
  }

  const image = formData.get('image');
  let nextImage: Parameters<typeof updateWork>[1]['image'];

  if (image instanceof File && image.size > 0) {
    const extension = ALLOWED_TYPES.get(image.type);
    if (!extension) {
      return NextResponse.json({ message: 'Поддерживаются изображения JPG, PNG и WebP.' }, { status: 400 });
    }
    if (image.size > MAX_IMAGE_SIZE) {
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

    nextImage = {
      imageUrl: storedImage.url,
      imageKey: storedImage.key,
      imageWidth: dimensions.width,
      imageHeight: dimensions.height,
    };
  }

  const work = await updateWork(id, {
    title,
    category,
    description,
    tags,
    image: nextImage,
  });

  if (nextImage) {
    await deleteWorkImage(existing.imageKey);
  }

  return NextResponse.json({ work });
}

export async function DELETE(_: Request, { params }: RouteParams) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: 'Требуется авторизация.' }, { status: 401 });
  }

  const { workId } = await params;
  const id = parseWorkId(workId);
  if (!id) {
    return NextResponse.json({ message: 'Некорректный идентификатор работы.' }, { status: 400 });
  }

  const existing = await getWorkOwnerInfo(id);
  if (!existing) {
    return NextResponse.json({ message: 'Работа не найдена.' }, { status: 404 });
  }
  if (existing.authorId !== user.id) {
    return NextResponse.json({ message: 'Можно удалять только свои работы.' }, { status: 403 });
  }

  await deleteWork(id);
  await deleteWorkImage(existing.imageKey);

  return NextResponse.json({ deleted: true });
}
