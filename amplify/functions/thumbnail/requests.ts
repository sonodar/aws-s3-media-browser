import type { S3Event } from "aws-lambda";

/**
 * Direct invocation for rebuilding the thumbnail of an object that is already
 * stored (see scripts/regenerate-thumbnails.ts).
 *
 * S3 notifications URL-encode the object key, and keys here contain the file
 * names people chose, so a hand-built notification would mangle names with
 * spaces. Taking the key as-is avoids that encoding entirely.
 */
export type RegenerateEvent = { bucket: string; key: string };

export type ThumbnailEvent = S3Event | RegenerateEvent;

export type ThumbnailRequest = { eventName: string; bucket: string; key: string };

/** Whether the event came from a direct invocation rather than a notification */
export function isRegenerate(event: ThumbnailEvent): event is RegenerateEvent {
  return !("Records" in event);
}

/**
 * Normalize both entry points into the same list of objects to process.
 */
export function requestsOf(event: ThumbnailEvent): ThumbnailRequest[] {
  if (isRegenerate(event)) {
    // Rebuilding always replaces the thumbnail, so treat it as an upload
    return [{ eventName: "ObjectCreated:Regenerate", bucket: event.bucket, key: event.key }];
  }

  return event.Records.map((record) => ({
    eventName: record.eventName,
    bucket: record.s3.bucket.name,
    key: decodeURIComponent(record.s3.object.key.replace(/\+/g, " ")),
  }));
}
