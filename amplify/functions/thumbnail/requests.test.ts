import type { S3Event } from "aws-lambda";
import { describe, expect, it } from "vitest";
import { isRegenerate, requestsOf } from "./requests";

const BUCKET = "media-bucket";

function notification(...keys: string[]): S3Event {
  return {
    Records: keys.map((key) => ({
      eventName: "ObjectCreated:Put",
      s3: { bucket: { name: BUCKET }, object: { key } },
    })),
  } as S3Event;
}

describe("thumbnail requests", () => {
  describe("requestsOf", () => {
    it("should take every object out of a notification", () => {
      expect(requestsOf(notification("media/abc/one.mp4", "media/abc/two.jpg"))).toEqual([
        { eventName: "ObjectCreated:Put", bucket: BUCKET, key: "media/abc/one.mp4" },
        { eventName: "ObjectCreated:Put", bucket: BUCKET, key: "media/abc/two.jpg" },
      ]);
    });

    it("should decode the key of a notification", () => {
      // S3 encodes the key, and these keys are the file names people chose
      expect(requestsOf(notification("media/abc/my+holiday+clip%281%29.mp4"))[0].key).toBe(
        "media/abc/my holiday clip(1).mp4",
      );
    });

    it("should take the key of a direct invocation as-is", () => {
      expect(requestsOf({ bucket: BUCKET, key: "media/abc/my holiday clip(1).mp4" })).toEqual([
        {
          eventName: "ObjectCreated:Regenerate",
          bucket: BUCKET,
          key: "media/abc/my holiday clip(1).mp4",
        },
      ]);
    });
  });

  describe("isRegenerate", () => {
    it("should tell a direct invocation from a notification", () => {
      expect(isRegenerate({ bucket: BUCKET, key: "media/abc/one.mp4" })).toBe(true);
      expect(isRegenerate(notification("media/abc/one.mp4"))).toBe(false);
    });
  });
});
