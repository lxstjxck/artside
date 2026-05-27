import { NextResponse } from 'next/server';
import { getImageDimensions } from '@/lib/image-metadata';
import { getSessionUser } from '@/lib/session-user';
import { deleteWorkImage, uploadWorkImage } from '@/lib/work-image-storage';
import { deleteWork, getWorkById, getWorkOwnerInfo, updateWork } from '@/lib/work-store';

type RouteParams = {
  params: Promise<{
    workId: string;
  }>;
};

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_WORK_IMAGES = 8;
const MAX_GALLERY_IMAGES = MAX_WORK_IMAGES - 1;
const ALLOWED_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

const trimString = (value: FormDataEntryValue | null) => (typeof value === 'string' ? value.trim() : '');
const parseTags = (value: string) => value.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 8);
const parseStatus = (value: FormDataEntryValue | null) => {
  if (value === 'draft') return 'draft';
  if (value === 'published' || value === 'pending') return 'pending';
  return undefined;
};

const parseWorkId = (value: string) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const storeImageFile = async (image: File) => {
  const extension = ALLOWED_TYPES.get(image.type);
  if (!extension) {
    throw new Error('UNSUPPORTED_IMAGE_TYPE');
  }
  if (image.size > MAX_IMAGE_SIZE || image.size <= 0) {
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

export async function GET(_: Request, { params }: RouteParams) {
  const sessionUser = await getSessionUser();
  const { workId } = await params;
  const id = parseWorkId(workId);
  if (!id) {
    return NextResponse.json({ message: 'Некорректный идентификатор работы.' }, { status: 400 });
  }

  const work = await getWorkById(id, sessionUser?.id);
  if (!work) {
    return NextResponse.json({ message: 'Работа не найдена.' }, { status: 404 });
  }

  const owner = await getWorkOwnerInfo(id);
  return NextResponse.json({
    work,
    isOwner: Boolean(sessionUser && owner?.authorId === sessionUser.id),
  });
}

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
  const status = parseStatus(formData.get('status'));

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
  const thumbnail = formData.get('thumbnail');
  const galleryFiles = formData.getAll('images').filter((item): item is File => item instanceof File && item.size > 0);
  const clearGallery = formData.get('clearGallery') === 'true';
  if (galleryFiles.length > MAX_GALLERY_IMAGES) {
    return NextResponse.json({ message: `В одной работе можно разместить до ${MAX_WORK_IMAGES} изображений, включая основное.` }, { status: 400 });
  }

  let nextImage: Parameters<typeof updateWork>[1]['image'];
  let nextThumbnail: Parameters<typeof updateWork>[1]['thumbnail'];
  let nextImages: Parameters<typeof updateWork>[1]['images'];

  try {
    if (image instanceof File && image.size > 0) {
      const storedImage = await storeImageFile(image);
      nextImage = {
        imageUrl: storedImage.url,
        imageKey: storedImage.key,
        imageWidth: storedImage.width,
        imageHeight: storedImage.height,
      };
    }

    if (thumbnail instanceof File && thumbnail.size > 0) {
      const storedThumbnail = await storeImageFile(thumbnail);
      nextThumbnail = {
        thumbnailUrl: storedThumbnail.url,
        thumbnailKey: storedThumbnail.key,
        thumbnailWidth: storedThumbnail.width,
        thumbnailHeight: storedThumbnail.height,
      };
    }

    if (nextImage && !nextThumbnail && existing.thumbnailKey === existing.imageKey) {
      nextThumbnail = {
        thumbnailUrl: nextImage.imageUrl,
        thumbnailKey: nextImage.imageKey,
        thumbnailWidth: nextImage.imageWidth,
        thumbnailHeight: nextImage.imageHeight,
      };
    }

    if (nextImage || galleryFiles.length > 0 || clearGallery) {
      const galleryImages = await Promise.all(galleryFiles.map(storeImageFile));
      const preservedGalleryImages = nextImage && galleryFiles.length === 0 && !clearGallery
        ? existing.images
            .filter((item) => item.sortOrder > 0)
            .map((item, index) => ({
              url: item.url,
              key: item.key,
              width: item.width,
              height: item.height,
              sortOrder: index + 1,
            }))
        : [];
      const primary = [{
        url: nextImage?.imageUrl ?? existing.imageUrl,
        key: nextImage?.imageKey ?? existing.imageKey,
        width: nextImage?.imageWidth ?? existing.imageWidth,
        height: nextImage?.imageHeight ?? existing.imageHeight,
        sortOrder: 0,
      }];
      nextImages = [
        ...primary,
        ...(galleryImages.length > 0 ? galleryImages.map((item, index) => ({
          url: item.url,
          key: item.key,
          width: item.width,
          height: item.height,
          sortOrder: index + primary.length,
        })) : preservedGalleryImages),
      ];
    }
  } catch (error) {
    const code = (error as Error).message;
    if (code === 'UNSUPPORTED_IMAGE_TYPE') {
      return NextResponse.json({ message: 'Поддерживаются изображения JPG, PNG и WebP.' }, { status: 400 });
    }
    if (code === 'INVALID_IMAGE_SIZE') {
      return NextResponse.json({ message: 'Размер изображения должен быть до 8 МБ.' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Не удалось определить размеры изображения.' }, { status: 400 });
  }

  const work = await updateWork(id, {
    title,
    category,
    description,
    status,
    tags,
    image: nextImage,
    thumbnail: nextThumbnail,
    images: nextImages,
  });

  await Promise.all([
    nextImage ? deleteWorkImage(existing.imageKey) : Promise.resolve(),
    nextThumbnail ? deleteWorkImage(existing.thumbnailKey) : Promise.resolve(),
    ...(nextImages
      ? existing.images
          .filter((image) => image.key && !nextImages.some((nextImage) => nextImage.key === image.key))
          .map((image) => deleteWorkImage(image.key))
      : []),
  ]);

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
  await Promise.all([
    deleteWorkImage(existing.imageKey),
    deleteWorkImage(existing.thumbnailKey),
    ...existing.images.map((image) => deleteWorkImage(image.key)),
  ]);

  return NextResponse.json({ deleted: true });
}
