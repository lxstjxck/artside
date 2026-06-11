import sharp from 'sharp';
import { getImageDimensions } from '@/lib/image-metadata';
import { uploadWorkImage } from '@/lib/work-image-storage';

const THUMBNAIL_WIDTH = 640;
const THUMBNAIL_QUALITY = 58;

const ALLOWED_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

export type StoredWorkImage = {
  url: string;
  key: string;
  width: number;
  height: number;
};

type ValidatedImageFile = {
  buffer: Buffer;
  contentType: string;
  extension: string;
  width: number;
  height: number;
};

const readImageFile = async (image: File, maxSize: number): Promise<ValidatedImageFile> => {
  const extension = ALLOWED_TYPES.get(image.type);
  if (!extension) {
    throw new Error('UNSUPPORTED_IMAGE_TYPE');
  }

  if (image.size <= 0 || image.size > maxSize) {
    throw new Error('INVALID_IMAGE_SIZE');
  }

  const buffer = Buffer.from(await image.arrayBuffer());
  const dimensions = getImageDimensions(buffer);
  if (!dimensions) {
    throw new Error('INVALID_IMAGE_DIMENSIONS');
  }

  return {
    buffer,
    contentType: image.type,
    extension,
    width: dimensions.width,
    height: dimensions.height,
  };
};

export const storeOriginalWorkImage = async (image: File, maxSize: number): Promise<StoredWorkImage & { buffer: Buffer }> => {
  const file = await readImageFile(image, maxSize);
  const storedImage = await uploadWorkImage({
    buffer: file.buffer,
    extension: file.extension,
    contentType: file.contentType,
  });

  return {
    url: storedImage.url,
    key: storedImage.key,
    width: file.width,
    height: file.height,
    buffer: file.buffer,
  };
};

export const storeAvifWorkThumbnail = async (image: File | Buffer, maxSize?: number): Promise<StoredWorkImage> => {
  const source = image instanceof File
    ? (await readImageFile(image, maxSize ?? image.size)).buffer
    : image;

  const { data, info } = await sharp(source, { failOn: 'error' })
    .rotate()
    .resize({
      width: THUMBNAIL_WIDTH,
      withoutEnlargement: true,
    })
    .avif({
      quality: THUMBNAIL_QUALITY,
      effort: 4,
    })
    .toBuffer({ resolveWithObject: true });

  const storedImage = await uploadWorkImage({
    buffer: data,
    extension: 'avif',
    contentType: 'image/avif',
  });

  return {
    url: storedImage.url,
    key: storedImage.key,
    width: info.width,
    height: info.height,
  };
};
