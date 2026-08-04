import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import { spawn } from "child_process";
import { readFile, unlink, access, stat } from "fs/promises";
import { constants, createWriteStream } from "fs";
import { join } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { type Command, type CommandOutput, extractFrame, type FrameTools } from "./frame";
import { describeSize, fitsInTmp, TMP_STORAGE_MB } from "./limits";
import { isRegenerate, requestsOf, type ThumbnailEvent } from "./requests";
import { isImageFile, isVideoFile, getThumbnailPath } from "./utils";

/**
 * FFmpeg binary paths (from Lambda Layer)
 */
const FFMPEG_PATH = "/opt/bin/ffmpeg";
const FFPROBE_PATH = "/opt/bin/ffprobe";

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
export const handler = async (event: ThumbnailEvent): Promise<void> => {
  // A direct invocation is a manual operation on a single object, so its
  // failure has to reach the caller instead of ending up in the log only
  const direct = isRegenerate(event);

  for (const { eventName, bucket, key } of requestsOf(event)) {
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
      if (direct) {
        throw error;
      }
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

    // Refuse before downloading. Without this the function dies with an out of
    // memory or a full disk, and neither says which object caused it
    const byteSize = response.ContentLength ?? 0;
    if (!fitsInTmp(byteSize)) {
      throw new Error(
        `Video is ${describeSize(byteSize)}, which does not fit in ${TMP_STORAGE_MB}MB of /tmp: ${key}`,
      );
    }

    // Stream to the temp file. Reading the whole video into a Buffer made the
    // memory use scale with the file size (and the SDK holds the chunks twice
    // while concatenating), which is what used to kill this function
    if (!(response.Body instanceof Readable)) {
      throw new Error(`Body of ${key} is not readable as a stream`);
    }
    await pipeline(response.Body, createWriteStream(videoPath));

    // Pick the frame: skip the container delay, then avoid recorded black
    // pixels by looking for the first scene change (see frame.ts)
    const source = await extractFrame(frameTools, { input: videoPath, output: framePath });
    console.log(`Frame extracted for ${key} (${source})`);

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
 * Run FFmpeg or FFprobe and return both streams.
 *
 * Both are needed by the frame selection: the start time comes from stdout, and
 * the black frame detection prints to stderr.
 */
function runCommand({ command, args }: Command): Promise<CommandOutput> {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args);

    let stdout = "";
    let stderr = "";
    process.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`${command} exited with code ${code}: ${stderr}`));
      }
    });

    process.on("error", (err) => {
      reject(new Error(`${command} process error: ${err.message}`));
    });
  });
}

/**
 * Size of a written file, or 0 when FFmpeg wrote nothing.
 */
async function sizeOf(path: string): Promise<number> {
  try {
    return (await stat(path)).size;
  } catch {
    return 0;
  }
}

const frameTools: FrameTools = {
  binaries: { ffmpeg: FFMPEG_PATH, ffprobe: FFPROBE_PATH },
  run: runCommand,
  sizeOf,
};
