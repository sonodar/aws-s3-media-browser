import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseUrlPath, syncToUrl, PATH_PARAM } from "./urlSync";

describe("urlSync utilities", () => {
  const originalLocation = window.location;
  const originalHistory = window.history;

  beforeEach(() => {
    // Reset URL before each test
    vi.stubGlobal("location", {
      ...originalLocation,
      href: "http://localhost/",
      search: "",
    });
    vi.stubGlobal("history", {
      ...originalHistory,
      pushState: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("parseUrlPath", () => {
    it("should return empty string when no path parameter exists", () => {
      vi.stubGlobal("location", {
        ...originalLocation,
        href: "http://localhost/",
        search: "",
      });

      expect(parseUrlPath()).toBe("");
    });

    it("should parse simple path correctly", () => {
      vi.stubGlobal("location", {
        ...originalLocation,
        href: "http://localhost/?path=folder1",
        search: "?path=folder1",
      });

      expect(parseUrlPath()).toBe("folder1");
    });

    it("should parse nested path correctly", () => {
      vi.stubGlobal("location", {
        ...originalLocation,
        href: "http://localhost/?path=folder1%2Ffolder2",
        search: "?path=folder1%2Ffolder2",
      });

      expect(parseUrlPath()).toBe("folder1/folder2");
    });

    it("should decode Japanese folder names correctly", () => {
      const japanesePath = "写真/2024/旅行";
      const encodedPath = encodeURIComponent(japanesePath);
      vi.stubGlobal("location", {
        ...originalLocation,
        href: `http://localhost/?path=${encodedPath}`,
        search: `?path=${encodedPath}`,
      });

      expect(parseUrlPath()).toBe(japanesePath);
    });

    it("should handle malformed encoding gracefully", () => {
      // Note: URLSearchParams.get() handles malformed encoding without throwing
      // It returns a replacement character (U+FFFD) for invalid sequences
      vi.stubGlobal("location", {
        ...originalLocation,
        href: "http://localhost/?path=%E0%A4%A",
        search: "?path=%E0%A4%A",
      });

      // URLSearchParams gracefully handles malformed encoding
      const result = parseUrlPath();
      expect(typeof result).toBe("string");
    });
  });

  describe("syncToUrl", () => {
    it("should set path parameter for non-empty path", () => {
      vi.stubGlobal("location", {
        ...originalLocation,
        href: "http://localhost/",
        search: "",
      });

      syncToUrl("folder1");

      expect(window.history.pushState).toHaveBeenCalledWith(
        { path: "folder1" },
        "",
        "http://localhost/?path=folder1",
      );
    });

    it("should encode slashes in nested paths", () => {
      vi.stubGlobal("location", {
        ...originalLocation,
        href: "http://localhost/",
        search: "",
      });

      syncToUrl("folder1/folder2");

      // URLSearchParams.set encodes slashes as %2F
      const url = new URL("http://localhost/");
      url.searchParams.set("path", "folder1/folder2");

      expect(window.history.pushState).toHaveBeenCalledWith(
        { path: "folder1/folder2" },
        "",
        url.toString(),
      );
    });

    it("should encode Japanese characters correctly", () => {
      vi.stubGlobal("location", {
        ...originalLocation,
        href: "http://localhost/",
        search: "",
      });

      const japanesePath = "写真/旅行";
      syncToUrl(japanesePath);

      // URLSearchParams.set handles encoding automatically
      const url = new URL("http://localhost/");
      url.searchParams.set("path", japanesePath);

      expect(window.history.pushState).toHaveBeenCalledWith(
        { path: japanesePath },
        "",
        url.toString(),
      );
    });

    it("should remove path parameter for empty path (root directory)", () => {
      vi.stubGlobal("location", {
        ...originalLocation,
        href: "http://localhost/?path=folder1",
        search: "?path=folder1",
      });

      syncToUrl("");

      expect(window.history.pushState).toHaveBeenCalledWith({ path: "" }, "", "http://localhost/");
    });

    it("should preserve other query parameters", () => {
      vi.stubGlobal("location", {
        ...originalLocation,
        href: "http://localhost/?other=value",
        search: "?other=value",
      });

      syncToUrl("folder1");

      expect(window.history.pushState).toHaveBeenCalledWith(
        { path: "folder1" },
        "",
        expect.stringContaining("other=value"),
      );
      expect(window.history.pushState).toHaveBeenCalledWith(
        { path: "folder1" },
        "",
        expect.stringContaining("path=folder1"),
      );
    });
  });
});
