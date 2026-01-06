import type { S3Handler, S3Event } from "aws-lambda";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import { spawn } from "child_process";
import { writeFile, readFile, unlink, access } from "fs/promises";
import { constants } from "fs";
import { join } from "path";
import { isImageFile, isVideoFile, getThumbnailPath } from "./utils";

/**
 * FFmpeg binary path (from Lambda Layer)
 */
const FFMPEG_PATH = "/opt/bin/ffmpeg";

/**
 * Check if FFmpeg is available
 */
async function isFFmpegAvailable(): Promise<boolean> {
  try {
    await access(FFMPEG_PATH, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

const s3Client = new S3Client({});

/**
 * Thumbnail configuration
 */
const THUMBNAIL_CONFIG = {
  maxWidth: 400,
  maxHeight: 400,
  format: "jpeg" as const,
  quality: 80,
};

/**
 * S3 Event Handler for thumbnail generation and deletion
 */
export const handler: S3Handler = async (event: S3Event): Promise<void> => {
  for (const record of event.Records) {
    const eventName = record.eventName;
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

    console.log(`Processing event: ${eventName} for ${key}`);

    // Only process files in media/ prefix
    if (!key.startsWith("media/")) {
      console.log(`Skipping non-media path: ${key}`);
      continue;
    }

    try {
      if (eventName.startsWith("ObjectCreated")) {
        await handleUpload(bucket, key);
      } else if (eventName.startsWith("ObjectRemoved")) {
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
    // Check if FFmpeg is available
    if (await isFFmpegAvailable()) {
      await generateVideoThumbnail(bucket, key);
    } else {
      console.log(`FFmpeg not available, skipping video thumbnail: ${key}`);
    }
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
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: thumbnailKey,
      }),
    );
    console.log(`Thumbnail deleted: ${thumbnailKey}`);
  } catch (error) {
    // Ignore "NoSuchKey" errors - thumbnail may not exist
    if ((error as { name?: string }).name !== "NoSuchKey") {
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

  // Get upload time from object metadata
  const uploadTime = response.LastModified;

  const inputBuffer = Buffer.from(await response.Body.transformToByteArray());

  // Generate thumbnail with Sharp
  // fit: 'inside' maintains aspect ratio within max dimensions
  const thumbnailBuffer = await sharp(inputBuffer)
    .resize(THUMBNAIL_CONFIG.maxWidth, THUMBNAIL_CONFIG.maxHeight, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: THUMBNAIL_CONFIG.quality })
    .toBuffer();

  // Save thumbnail
  const thumbnailKey = getThumbnailPath(key);
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: thumbnailKey,
      Body: thumbnailBuffer,
      ContentType: "image/jpeg",
    }),
  );

  // Calculate and log processing time
  const completedTime = new Date();
  if (uploadTime) {
    const processingTimeMs = completedTime.getTime() - uploadTime.getTime();
    console.log(
      `Thumbnail created: ${thumbnailKey} (processing time: ${processingTimeMs}ms from upload)`,
    );
  } else {
    console.log(`Thumbnail created: ${thumbnailKey}`);
  }
}

/**
 * Generate thumbnail for video file
 * Uses FFmpeg to extract a frame, then Sharp to resize
 */
async function generateVideoThumbnail(bucket: string, key: string): Promise<void> {
  console.log(`Generating video thumbnail: ${key}`);

  // Create unique temp file names
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(7);
  const videoPath = join("/tmp", `video_${timestamp}_${randomSuffix}`);
  const framePath = join("/tmp", `frame_${timestamp}_${randomSuffix}.png`);

  try {
    // Get original video
    const getCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    const response = await s3Client.send(getCommand);

    if (!response.Body) {
      throw new Error(`Empty body for ${key}`);
    }

    // Get upload time from object metadata
    const uploadTime = response.LastModified;

    // Write video to temp file
    const videoBuffer = Buffer.from(await response.Body.transformToByteArray());
    await writeFile(videoPath, videoBuffer);

    // Extract frame using blackframe filter to skip black frames
    // blackframe detects black frames, metadata=select filters them out
    try {
      await runFFmpeg([
        "-i",
        videoPath,
        "-vf",
        "blackframe=0,metadata=select:key=lavfi.blackframe.pblack:value=50:function=less",
        "-frames:v",
        "1",
        "-y",
        framePath,
      ]);
    } catch {
      // If blackframe filter failed, fallback to simple frame at 1 second
      console.log("Blackframe filter failed, falling back to simple frame extraction");
      await runFFmpeg(["-ss", "1", "-i", videoPath, "-frames:v", "1", "-y", framePath]);
    }

    // Check if frame was extracted, if not try fallback
    try {
      await access(framePath, constants.R_OK);
    } catch {
      console.log("No frame extracted, trying fallback at 0 seconds");
      await runFFmpeg(["-i", videoPath, "-frames:v", "1", "-y", framePath]);
    }

    // Read extracted frame
    const frameBuffer = await readFile(framePath);

    // Generate thumbnail with Sharp
    const thumbnailBuffer = await sharp(frameBuffer)
      .resize(THUMBNAIL_CONFIG.maxWidth, THUMBNAIL_CONFIG.maxHeight, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: THUMBNAIL_CONFIG.quality })
      .toBuffer();

    // Save thumbnail
    const thumbnailKey = getThumbnailPath(key);
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentType: "image/jpeg",
      }),
    );

    // Calculate and log processing time
    const completedTime = new Date();
    if (uploadTime) {
      const processingTimeMs = completedTime.getTime() - uploadTime.getTime();
      console.log(
        `Video thumbnail created: ${thumbnailKey} (processing time: ${processingTimeMs}ms from upload)`,
      );
    } else {
      console.log(`Video thumbnail created: ${thumbnailKey}`);
    }
  } finally {
    // Clean up temp files
    await Promise.all([unlink(videoPath).catch(() => {}), unlink(framePath).catch(() => {})]);
  }
}

/**
 * Run FFmpeg command and return promise
 */
function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn(FFMPEG_PATH, args);

    let stderr = "";
    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
      }
    });

    process.on("error", (err) => {
      reject(new Error(`FFmpeg process error: ${err.message}`));
    });
  });
}
