import { defineFunction } from '@aws-amplify/backend';

/**
 * Environment variable for Sharp Lambda Layer ARN
 * Users must deploy Sharp Layer from SAR and set this variable.
 * See README.md for setup instructions.
 */
const SHARP_LAYER_ARN = process.env.SHARP_LAYER_ARN;

// Validate required environment variable at build time
if (!SHARP_LAYER_ARN) {
  throw new Error(
    'SHARP_LAYER_ARN environment variable is required.\n' +
    'Deploy Sharp Lambda Layer from AWS SAR and set the ARN.\n' +
    'See README.md for setup instructions.'
  );
}

/**
 * Thumbnail generation Lambda function
 * Triggered by S3 upload and delete events
 */
export const thumbnailFunction = defineFunction({
  name: 'thumbnail',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024,
  architecture: 'x86_64',
  layers: {
    // Key is module name for esbuild external bundling
    sharp: SHARP_LAYER_ARN,
  },
});
