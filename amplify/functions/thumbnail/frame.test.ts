import { describe, expect, it } from "vitest";
import {
  type Binaries,
  type Command,
  extractFrame,
  type FrameTools,
  parseStartOffset,
} from "./frame";

const INPUT = "/tmp/video";
const OUTPUT = "/tmp/frame.png";
const BINARIES: Binaries = { ffmpeg: "ffmpeg", ffprobe: "ffprobe" };

/**
 * Stand-in for FFmpeg. Records every command so the order of the steps is
 * visible, and answers the black check and the written size from the options.
 */
function tools({
  startTime = "0.000000",
  black = false,
  sizes = [1024],
}: {
  startTime?: string;
  black?: boolean;
  sizes?: number[];
} = {}) {
  const commands: Command[] = [];
  const written = [...sizes];
  const injected: FrameTools = {
    binaries: BINARIES,
    run: async (command) => {
      commands.push(command);
      if (command.command === BINARIES.ffprobe) {
        return { stdout: startTime, stderr: "" };
      }
      if (command.args.includes("null")) {
        return { stdout: "", stderr: black ? "[Parsed_blackframe_0] frame:0 pblack:100 " : "" };
      }
      return { stdout: "", stderr: "" };
    },
    sizeOf: async () => written.shift() ?? 0,
  };
  return { tools: injected, commands };
}

/** Commands that write the frame. The black check writes nothing, so it is excluded. */
function extractions(commands: Command[]) {
  return commands.filter(
    ({ command, args }) => command === BINARIES.ffmpeg && args.includes(OUTPUT),
  );
}

function filtersOf(command: Command): string | undefined {
  const at = command.args.indexOf("-vf");
  return at === -1 ? undefined : command.args[at + 1];
}

function offsetOf(command: Command): string {
  return command.args[command.args.indexOf("-ss") + 1];
}

describe("frame selection", () => {
  describe("parseStartOffset", () => {
    it("should take the number out of an output with trailing characters", () => {
      expect(parseStartOffset("1.041667,\n")).toBe("1.041667");
    });

    it("should fall back to the start when the output cannot be read", () => {
      expect(parseStartOffset("N/A")).toBe("0");
      expect(parseStartOffset("")).toBe("0");
    });

    it("should fall back to the start for a negative start time", () => {
      // MOV files with an edit list report this, and FFmpeg refuses it as -ss
      expect(parseStartOffset("-0.033333")).toBe("0");
    });
  });

  describe("extractFrame", () => {
    it("should use the frame at the offset when it is not black", async () => {
      const { tools: injected, commands } = tools({ startTime: "1.5" });

      expect(await extractFrame(injected, { input: INPUT, output: OUTPUT })).toBe("first-frame");

      const written = extractions(commands);
      expect(written).toHaveLength(1);
      expect(offsetOf(written[0])).toBe("1.5");
      expect(filtersOf(written[0])).toBeUndefined();
    });

    it("should look for a scene change when the frame is black", async () => {
      const { tools: injected, commands } = tools({ black: true });

      expect(await extractFrame(injected, { input: INPUT, output: OUTPUT })).toBe("scene-change");

      const written = extractions(commands);
      expect(written).toHaveLength(1);
      expect(filtersOf(written[0])).toBe("select='gt(scene,0.1)'");
    });

    it("should run the black check at the offset, not at the very start", async () => {
      // The other order mistakes the container delay for recorded black pixels
      const { tools: injected, commands } = tools({ startTime: "0.5", black: true });

      await extractFrame(injected, { input: INPUT, output: OUTPUT });

      const check = commands.find(({ args }) => args.includes("blackframe=amount=98:threshold=32"));
      expect(check && offsetOf(check)).toBe("0.5");
    });

    it("should fall back to the offset when there is no scene change", async () => {
      const { tools: injected, commands } = tools({ black: true, sizes: [0, 2048] });

      expect(await extractFrame(injected, { input: INPUT, output: OUTPUT })).toBe(
        "scene-change-empty",
      );

      const written = extractions(commands);
      expect(written).toHaveLength(2);
      expect(filtersOf(written[1])).toBeUndefined();
    });

    it("should fail when nothing was written", async () => {
      const { tools: injected } = tools({ sizes: [0] });

      await expect(extractFrame(injected, { input: INPUT, output: OUTPUT })).rejects.toThrow(
        /no frame was written/,
      );
    });

    it("should restrict every command to the downloaded file", async () => {
      // Containers may reference other locations, and uploads reach this
      // function before anything has inspected them
      const { tools: injected, commands } = tools({ black: true, sizes: [0, 1024] });

      await extractFrame(injected, { input: INPUT, output: OUTPUT });

      expect(commands).not.toHaveLength(0);
      for (const { args } of commands) {
        expect(args[args.indexOf("-protocol_whitelist") + 1]).toBe("file");
      }
    });
  });
});
