import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

type UploadImageParams = {
  buffer: Buffer;
  contentType: string;
  extension: string;
};

type StoredImage = {
  url: string;
  key: string;
};

const getS3Config = () => {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION ?? 'auto';
  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL;

  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey || !publicBaseUrl) {
    return null;
  }

  return {
    bucket,
    region,
    endpoint,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl: publicBaseUrl.replace(/\/$/, ''),
  };
};

const getLocalUploadsDir = () => path.join(process.cwd(), 'public', 'uploads');

const getUploadKey = (extension: string) => {
  const date = new Date().toISOString().slice(0, 10);
  return `works/${date}/${Date.now()}-${randomUUID()}.${extension}`;
};

export const uploadWorkImage = async ({ buffer, contentType, extension }: UploadImageParams): Promise<StoredImage> => {
  const key = getUploadKey(extension);
  const s3Config = getS3Config();

  if (s3Config) {
    const client = new S3Client({
      region: s3Config.region,
      endpoint: s3Config.endpoint,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
    });

    await client.send(new PutObjectCommand({
      Bucket: s3Config.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }));

    return {
      key,
      url: `${s3Config.publicBaseUrl}/${key}`,
    };
  }

  const uploadsDir = getLocalUploadsDir();
  const localPath = path.join(uploadsDir, key);
  await mkdir(path.dirname(localPath), { recursive: true });
  await writeFile(localPath, buffer);

  return {
    key,
    url: `/uploads/${key}`,
  };
};

export const deleteWorkImage = async (key: string | null | undefined) => {
  if (!key) return;

  const s3Config = getS3Config();
  if (s3Config) {
    const client = new S3Client({
      region: s3Config.region,
      endpoint: s3Config.endpoint,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
    });

    await client.send(new DeleteObjectCommand({
      Bucket: s3Config.bucket,
      Key: key,
    }));
    return;
  }

  const localPath = path.join(getLocalUploadsDir(), key);
  await unlink(localPath).catch(() => undefined);
};
