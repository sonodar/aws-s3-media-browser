import { defineFunction } from '@aws-amplify/backend';

/**
 * Environment variables for Lambda Layer ARNs
 * Users must deploy these layers and set the environment variables.
 * See README.md for setup instructions.
 */
const SHARP_LAYER_ARN = process.env.SHARP_LAYER_ARN;
const FFMPEG_LAYER_ARN = process.env.FFMPEG_LAYER_ARN;

// Validate required environment variables at build time
if (!SHARP_LAYER_ARN) {
  throw new Error(
    'SHARP_LAYER_ARN environment variable is required.\n' +
    'Deploy Sharp Lambda Layer and set the ARN.\n' +
    'See README.md for setup instructions.'
  );
}

// Build layers configuration
// Sharp is required, FFmpeg is optional (for video thumbnails)
const layers: Record<string, string> = {
  // Key is module name for esbuild external bundling
  sharp: SHARP_LAYER_ARN,
};

if (FFMPEG_LAYER_ARN) {
  // FFmpeg is a binary, not a Node module, but adding to layers still works
  // The key name doesn't matter for binaries
  layers['ffmpeg-binary'] = FFMPEG_LAYER_ARN;
}

/**
 * Thumbnail generation Lambda function
 * Triggered by S3 upload and delete events
 */
export const thumbnailFunction = defineFunction({
  name: 'thumbnail',
  entry: './handler.ts',
  runtime: 22,
  timeoutSeconds: 30,
  memoryMB: 1024,
  architecture: 'arm64',
  layers,
});
