/**
 * Size limits of the thumbnail function.
 *
 * The function definition and the handler have to agree on how much room /tmp
 * has: the definition asks for it, and the handler refuses videos that would
 * not fit. Written down once so the two cannot drift apart.
 */

/**
 * Ephemeral storage (/tmp) of the function in MB.
 *
 * A video is written there before FFmpeg reads it, so this has to cover the
 * largest video that can be uploaded. 464 MiB videos exist in production, and
 * the default 512 MB left no room at all. Storage beyond 512 MB is billed per
 * GB-second, which is negligible at this call volume.
 */
export const TMP_STORAGE_MB = 2048;

/**
 * Room to keep free for the extracted frame. One PNG frame of a 4K video stays
 * well below this.
 */
const FRAME_HEADROOM_MB = 64;

const MB = 1024 * 1024;

/**
 * Whether a video of this size can be written to /tmp.
 *
 * Checked before downloading. Without it the function dies with an out of
 * memory or a full disk, and neither says which object caused it.
 */
export function fitsInTmp(byteSize: number): boolean {
  return byteSize > 0 && byteSize <= (TMP_STORAGE_MB - FRAME_HEADROOM_MB) * MB;
}

/** Human readable size for the log line that reports a refusal */
export function describeSize(byteSize: number): string {
  return `${Math.round(byteSize / MB)}MB`;
}
