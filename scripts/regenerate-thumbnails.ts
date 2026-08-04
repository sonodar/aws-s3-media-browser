import { readFile } from "node:fs/promises";
import { InvokeCommand, LambdaClient, ListFunctionsCommand } from "@aws-sdk/client-lambda";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { isVideoFile } from "../amplify/functions/thumbnail/utils";

/**
 * Rebuild the thumbnails of videos that are already stored.
 *
 * Thumbnails are only produced when an object is uploaded, so a change to the
 * frame selection leaves every existing video with the thumbnail its old logic
 * picked. This walks the stored videos and rebuilds them.
 *
 * The Lambda does the work. Running FFmpeg locally would produce thumbnails
 * without ever exercising the deployed path (layer binaries, function
 * permissions), which is the part that needs to hold.
 *
 * Existing thumbnails are always overwritten: the point is to replace what the
 * old logic produced, and a black thumbnail is indistinguishable from a good
 * one without looking at it.
 *
 * Images are left alone. Their thumbnails come from Sharp only, and nothing
 * about that changed.
 *
 * ```
 * npx tsx scripts/regenerate-thumbnails.ts [--bucket=...] [--function=...] [--dry-run]
 * ```
 */

const MEDIA_PREFIX = "media/";

/** Deployed functions carry a generated suffix, so match on the part we choose */
const FUNCTION_HINT = "thumbnail";

const s3 = new S3Client({});
const lambda = new LambdaClient({});

function option(name: string): string | undefined {
  return process.argv.find((value) => value.startsWith(`--${name}=`))?.split("=")[1];
}

/**
 * Default to the bucket of the current sandbox. Point --bucket at another
 * environment to rebuild there.
 */
async function defaultBucket(): Promise<string> {
  const outputs: unknown = JSON.parse(await readFile("amplify_outputs.json", "utf8"));
  const bucket =
    typeof outputs === "object" && outputs !== null && "storage" in outputs
      ? (outputs.storage as { bucket_name?: string }).bucket_name
      : undefined;
  if (!bucket) {
    throw new Error("amplify_outputs.json has no bucket. Pass --bucket=");
  }
  return bucket;
}

/**
 * Resolve which function to call. Refuse to guess when several environments
 * match: pointing one environment's function at another environment's bucket
 * is worse than typing the name.
 */
async function resolveFunctionName(): Promise<string> {
  const given = option("function");
  if (given) {
    return given;
  }

  const names: string[] = [];
  let marker: string | undefined;
  do {
    const page = await lambda.send(new ListFunctionsCommand({ Marker: marker }));
    names.push(...(page.Functions ?? []).flatMap(({ FunctionName }) => FunctionName ?? []));
    marker = page.NextMarker;
  } while (marker);

  const candidates = names.filter((name) => name.toLowerCase().includes(FUNCTION_HINT));
  if (candidates.length !== 1) {
    throw new Error(`Pass --function=. Candidates: ${candidates.join(", ") || "none"}`);
  }
  return candidates[0];
}

async function videoKeys(bucket: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const page = await list(bucket, token);
    keys.push(
      ...(page.Contents ?? []).flatMap(({ Key }) => (Key && isVideoFile(Key) ? [Key] : [])),
    );
    token = page.NextContinuationToken;
  } while (token);
  return keys;
}

async function list(bucket: string, token: string | undefined) {
  try {
    return await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: MEDIA_PREFIX, ContinuationToken: token }),
    );
  } catch (error) {
    // The default comes from amplify_outputs.json, which keeps pointing at a
    // sandbox that was deleted. Say so instead of only passing the S3 error on
    if (error instanceof Error && error.name === "NoSuchBucket" && !option("bucket")) {
      throw new Error(
        `${bucket} does not exist. amplify_outputs.json may be stale, so pass --bucket=`,
        { cause: error },
      );
    }
    throw error;
  }
}

async function main(): Promise<void> {
  const bucket = option("bucket") ?? (await defaultBucket());
  const functionName = await resolveFunctionName();
  const dryRun = process.argv.includes("--dry-run");

  const targets = await videoKeys(bucket);
  console.log(`${bucket} / ${functionName}`);
  console.log(`${targets.length} video(s) to rebuild${dryRun ? " (dry run)" : ""}`);

  let failures = 0;
  for (const key of targets) {
    if (dryRun) {
      console.log(`${key}: skipped (dry run)`);
      continue;
    }

    // One object must not end the run. Nothing about the next video depends on
    // this one, and stopping halfway leaves the rest with no way to tell
    // whether they were reached
    try {
      const response = await lambda.send(
        new InvokeCommand({
          FunctionName: functionName,
          Payload: JSON.stringify({ bucket, key }),
        }),
      );
      // A direct invocation rethrows its failure, so this is set when the
      // thumbnail could not be rebuilt
      if (response.FunctionError) {
        failures += 1;
        const payload = response.Payload ? Buffer.from(response.Payload).toString("utf8") : "";
        console.error(`${key}: ${response.FunctionError} ${payload}`);
      } else {
        console.log(`${key}: rebuilt`);
      }
    } catch (error) {
      // The call itself did not go through (throttling, timeout, credentials)
      failures += 1;
      console.error(`${key}: not invoked`, error);
    }
  }

  if (failures > 0) {
    // Finishing successfully with thumbnails still missing would suggest the
    // run was enough
    console.error(`${failures} of ${targets.length} video(s) failed`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  // Only the setup can end up here (bucket, function name, listing). Report it
  // as a failed run instead of an unhandled rejection
  console.error(error);
  process.exitCode = 1;
});
