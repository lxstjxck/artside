import { NextResponse } from 'next/server';
import { getImageDimensions } from '@/lib/image-metadata';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getSessionUser } from '@/lib/session-user';
import { uploadWorkImage } from '@/lib/work-image-storage';
import { createWork } from '@/lib/work-store';

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const MAX_WORK_IMAGES = 8;
const MAX_GALLERY_IMAGES = MAX_WORK_IMAGES - 1;
const ALLOWED_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

const trimString = (value: FormDataEntryValue | null) => (typeof value === 'string' ? value.trim() : '');

const parseTags = (value: string) => {
  return value.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 8);
};

const parseStatus = (value: FormDataEntryValue | null) => {
  return value === 'draft' ? 'draft' : 'pending';
};

const storeImageFile = async (image: File) => {
  const extension = ALLOWED_TYPES.get(image.type);
  if (!extension) {
    throw new Error('UNSUPPORTED_IMAGE_TYPE');
  }

  if (image.size <= 0 || image.size > MAX_IMAGE_SIZE) {
    throw new Error('INVALID_IMAGE_SIZE');
  }

  const buffer = Buffer.from(await image.arrayBuffer());
  const dimensions = getImageDimensions(buffer);
  if (!dimensions) {
    throw new Error('INVALID_IMAGE_DIMENSIONS');
  }

  const storedImage = await uploadWorkImage({
    buffer,
    extension,
    contentType: image.type,
  });

  return {
    url: storedImage.url,
    key: storedImage.key,
    width: dimensions.width,
    height: dimensions.height,
  };
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
  const status = parseStatus(formData.get('status'));
  const image = formData.get('image');
  const thumbnail = formData.get('thumbnail');
  const galleryFiles = formData.getAll('images').filter((item): item is File => item instanceof File && item.size > 0);

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

  if (galleryFiles.length > MAX_GALLERY_IMAGES) {
    return NextResponse.json({ message: `В одной работе можно разместить до ${MAX_WORK_IMAGES} изображений, включая основное.` }, { status: 400 });
  }

  let primaryImage: Awaited<ReturnType<typeof storeImageFile>>;
  let thumbnailImage: Awaited<ReturnType<typeof storeImageFile>> | null = null;
  let galleryImages: Array<Awaited<ReturnType<typeof storeImageFile>>>;

  try {
    primaryImage = await storeImageFile(image);
    thumbnailImage = thumbnail instanceof File && thumbnail.size > 0 ? await storeImageFile(thumbnail) : null;
    galleryImages = await Promise.all(galleryFiles.map(storeImageFile));
  } catch (error) {
    const code = (error as Error).message;
    if (code === 'UNSUPPORTED_IMAGE_TYPE') {
      return NextResponse.json({ message: 'Поддерживаются изображения JPG, PNG и WebP.' }, { status: 400 });
    }
    if (code === 'INVALID_IMAGE_SIZE') {
      return NextResponse.json({ message: 'Размер изображения должен быть до 20 МБ.' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Не удалось определить размеры изображения.' }, { status: 400 });
  }

  const images = [
    {
      url: primaryImage.url,
      key: primaryImage.key,
      width: primaryImage.width,
      height: primaryImage.height,
      sortOrder: 0,
    },
    ...galleryImages.map((item, index) => ({
      url: item.url,
      key: item.key,
      width: item.width,
      height: item.height,
      sortOrder: index + 1,
    })),
  ];

  const work = await createWork(user.id, {
    title,
    category,
    description,
    status,
    imageUrl: primaryImage.url,
    imageKey: primaryImage.key,
    imageWidth: primaryImage.width,
    imageHeight: primaryImage.height,
    thumbnailUrl: thumbnailImage?.url ?? primaryImage.url,
    thumbnailKey: thumbnailImage?.key ?? primaryImage.key,
    thumbnailWidth: thumbnailImage?.width ?? primaryImage.width,
    thumbnailHeight: thumbnailImage?.height ?? primaryImage.height,
    images,
    tags,
  });

  return NextResponse.json({ work }, { status: 201 });
}
