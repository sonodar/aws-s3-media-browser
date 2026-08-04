/**
 * Frame selection for video thumbnails.
 *
 * Taking the very first frame often produces a black image. There are two
 * independent causes and both happen in practice:
 *
 * - Container delay: the video stream does not start at 0 (some encoders write
 *   an offset). The picture data is fine, but players show the delay as black.
 * - Black frames: black pixels are actually recorded, e.g. the camera started
 *   before the exposure settled.
 *
 * Skip the delay first, then decide whether the frame is black. In the other
 * order the delay itself looks like a black picture, which triggers a scene
 * search that is not needed.
 *
 * Command execution and file size are injected so the decisions can be verified
 * without FFmpeg or S3. The same steps then run unchanged in Lambda.
 */

/** A single command to run. Arguments stay separate because no shell is involved. */
export type Command = { command: string; args: string[] };

export type CommandOutput = { stdout: string; stderr: string };

/** Where the binaries live. In Lambda they come from the FFmpeg layer. */
export type Binaries = { ffmpeg: string; ffprobe: string };

/**
 * Command execution and the size of the written file.
 * `run` must reject when the command exits with a non-zero status.
 */
export type FrameTools = {
  binaries: Binaries;
  run: (command: Command) => Promise<CommandOutput>;
  sizeOf: (path: string) => Promise<number>;
};

/** Which step produced the frame. Only the log can tell these apart later. */
export type FrameSource = "first-frame" | "scene-change" | "scene-change-empty";

/**
 * Protocols FFmpeg may open. Only the file that was downloaded, nothing else.
 *
 * Some containers can reference other locations (HLS playlists, for example)
 * and FFmpeg would follow them. Uploads reach this function before anything has
 * inspected them, so no input may reach out of the sandbox.
 */
const ALLOWED_PROTOCOLS = ["-protocol_whitelist", "file"];

/**
 * Treat a frame as black when dark pixels (luma <= 32) cover 98% of the picture.
 * A lower bar would classify merely dim footage as black and force a scene
 * search that decodes the whole video.
 */
const BLACKFRAME_FILTER = "blackframe=amount=98:threshold=32";

/**
 * How much the picture must change to count as leaving the black part.
 * 0.1 is the established lower bound for "the picture switched".
 */
const SCENE_FILTER = "select='gt(scene,0.1)'";

/**
 * Start time of the video stream in seconds, or "0" when it cannot be read.
 *
 * The csv output of ffprobe contains non-numeric characters in some versions
 * ("0.000000,"), so only the number is taken. MOV files with an edit list can
 * report a negative start time, which FFmpeg refuses as an -ss argument.
 */
export function parseStartOffset(probeStdout: string): string {
  const found = /[-+]?[0-9]+(?:\.[0-9]+)?/.exec(probeStdout.trim());
  if (!found) {
    return "0";
  }
  const seconds = Number(found[0]);
  return Number.isFinite(seconds) && seconds > 0 ? found[0] : "0";
}

/**
 * Whether the checked frame is black. The blackframe filter only prints a line
 * containing "pblack" when it detects one, and the stream it prints to differs
 * between versions, so both are inspected.
 */
export function isBlackFrame({ stdout, stderr }: CommandOutput): boolean {
  return `${stdout}${stderr}`.includes("pblack");
}

export function probeCommand({ ffprobe }: Binaries, input: string): Command {
  return {
    command: ffprobe,
    args: [
      "-v",
      "error",
      ...ALLOWED_PROTOCOLS,
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=start_time",
      "-of",
      "csv=p=0",
      input,
    ],
  };
}

/**
 * Check a single frame at the given offset. Nothing is written, so the output
 * goes to the null muxer.
 */
export function blackCheckCommand({ ffmpeg }: Binaries, input: string, offset: string): Command {
  return {
    command: ffmpeg,
    args: [
      "-hide_banner",
      "-nostdin",
      ...ALLOWED_PROTOCOLS,
      "-ss",
      offset,
      "-i",
      input,
      "-frames:v",
      "1",
      "-vf",
      BLACKFRAME_FILTER,
      "-f",
      "null",
      "-",
    ],
  };
}

/**
 * Write one frame. The -ss before -i seeks before decoding, so long videos are
 * not decoded from the start.
 *
 * The recorded orientation is a display matrix which FFmpeg applies by default,
 * so a portrait video does not come out sideways. Resizing is left to Sharp,
 * which already produces the thumbnail dimensions.
 */
function extractCommand(
  { ffmpeg }: Binaries,
  input: string,
  offset: string,
  output: string,
  filters?: string,
): Command {
  return {
    command: ffmpeg,
    args: [
      "-v",
      "error",
      "-nostdin",
      ...ALLOWED_PROTOCOLS,
      "-ss",
      offset,
      "-i",
      input,
      ...(filters ? ["-vf", filters] : []),
      "-frames:v",
      "1",
      // Only one image is written, so treat the output as an overwrite instead
      // of an image sequence
      "-update",
      "1",
      "-y",
      output,
    ],
  };
}

export function firstFrameCommand(
  binaries: Binaries,
  input: string,
  offset: string,
  output: string,
): Command {
  return extractCommand(binaries, input, offset, output);
}

export function sceneChangeCommand(
  binaries: Binaries,
  input: string,
  offset: string,
  output: string,
): Command {
  return extractCommand(binaries, input, offset, output, SCENE_FILTER);
}

/**
 * Write a single frame, or throw when none could be written.
 *
 * A video that is black all the way through has no scene change, and FFmpeg
 * succeeds without writing anything. In that case fall back to the frame at the
 * offset: a black picture is what the video actually shows, which is still more
 * faithful than no thumbnail at all.
 */
export async function extractFrame(
  { binaries, run, sizeOf }: FrameTools,
  { input, output }: { input: string; output: string },
): Promise<FrameSource> {
  const offset = parseStartOffset((await run(probeCommand(binaries, input))).stdout);

  if (!isBlackFrame(await run(blackCheckCommand(binaries, input, offset)))) {
    await run(firstFrameCommand(binaries, input, offset, output));
    await requireWritten(sizeOf, output);
    return "first-frame";
  }

  await run(sceneChangeCommand(binaries, input, offset, output));
  if ((await sizeOf(output)) > 0) {
    return "scene-change";
  }

  await run(firstFrameCommand(binaries, input, offset, output));
  await requireWritten(sizeOf, output);
  return "scene-change-empty";
}

async function requireWritten(sizeOf: FrameTools["sizeOf"], output: string): Promise<void> {
  if ((await sizeOf(output)) > 0) {
    return;
  }
  throw new Error(`FFmpeg succeeded but no frame was written: ${output}`);
}
