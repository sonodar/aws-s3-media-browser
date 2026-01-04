import type { S3Handler, S3Event } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { isImageFile, isVideoFile, getThumbnailPath } from './utils';

const s3Client = new S3Client({});

/**
 * Thumbnail configuration
 */
const THUMBNAIL_CONFIG = {
  maxWidth: 400,
  maxHeight: 400,
  format: 'jpeg' as const,
  quality: 80,
};

/**
 * S3 Event Handler for thumbnail generation and deletion
 */
export const handler: S3Handler = async (event: S3Event): Promise<void> => {
  for (const record of event.Records) {
    const eventName = record.eventName;
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    console.log(`Processing event: ${eventName} for ${key}`);

    // Only process files in media/ prefix
    if (!key.startsWith('media/')) {
      console.log(`Skipping non-media path: ${key}`);
      continue;
    }

    try {
      if (eventName.startsWith('ObjectCreated')) {
        await handleUpload(bucket, key);
      } else if (eventName.startsWith('ObjectRemoved')) {
        await handleDelete(bucket, key);
      }
    } catch (error) {
      // Log error but don't throw - allow other records to process
      console.error(`Error processing ${key}:`, error);
    }
  }
};

/**
 * Handle file upload - generate thumbnail
 */
async function handleUpload(bucket: string, key: string): Promise<void> {
  if (isImageFile(key)) {
    await generateImageThumbnail(bucket, key);
  } else if (isVideoFile(key)) {
    // Video thumbnail generation will be implemented in Release 2
    console.log(`Video thumbnail generation not yet implemented: ${key}`);
  } else {
    console.log(`Skipping non-media file: ${key}`);
  }
}

/**
 * Handle file deletion - delete corresponding thumbnail
 */
async function handleDelete(bucket: string, key: string): Promise<void> {
  // Only delete thumbnails for media files
  if (!isImageFile(key) && !isVideoFile(key)) {
    console.log(`Skipping thumbnail deletion for non-media file: ${key}`);
    return;
  }

  const thumbnailKey = getThumbnailPath(key);
  console.log(`Deleting thumbnail: ${thumbnailKey}`);

  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: thumbnailKey,
    }));
    console.log(`Thumbnail deleted: ${thumbnailKey}`);
  } catch (error) {
    // Ignore "NoSuchKey" errors - thumbnail may not exist
    if ((error as { name?: string }).name !== 'NoSuchKey') {
      throw error;
    }
    console.log(`Thumbnail not found (already deleted or never created): ${thumbnailKey}`);
  }
}

/**
 * Generate thumbnail for image file
 */
async function generateImageThumbnail(bucket: string, key: string): Promise<void> {
  console.log(`Generating image thumbnail: ${key}`);

  // Get original image
  const getCommand = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  const response = await s3Client.send(getCommand);

  if (!response.Body) {
    throw new Error(`Empty body for ${key}`);
  }

  const inputBuffer = Buffer.from(await response.Body.transformToByteArray());

  // Generate thumbnail with Sharp
  // fit: 'inside' maintains aspect ratio within max dimensions
  const thumbnailBuffer = await sharp(inputBuffer)
    .resize(THUMBNAIL_CONFIG.maxWidth, THUMBNAIL_CONFIG.maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: THUMBNAIL_CONFIG.quality })
    .toBuffer();

  // Save thumbnail
  const thumbnailKey = getThumbnailPath(key);
  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: thumbnailKey,
    Body: thumbnailBuffer,
    ContentType: 'image/jpeg',
  }));

  console.log(`Thumbnail created: ${thumbnailKey}`);
}
