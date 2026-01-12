import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUploadTracker } from "./useUploadTracker";

describe("useUploadTracker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should start with empty recentlyUploadedKeys", () => {
    const { result } = renderHook(() => useUploadTracker());

    expect(result.current.recentlyUploadedKeys).toEqual([]);
  });

  it("should track uploaded keys", () => {
    const { result } = renderHook(() => useUploadTracker());

    act(() => {
      result.current.trackUpload(["key1", "key2"]);
    });

    expect(result.current.recentlyUploadedKeys).toEqual(["key1", "key2"]);
  });

  it("should add new keys to existing tracked keys", () => {
    const { result } = renderHook(() => useUploadTracker());

    act(() => {
      result.current.trackUpload(["key1"]);
    });

    act(() => {
      result.current.trackUpload(["key2", "key3"]);
    });

    expect(result.current.recentlyUploadedKeys).toEqual(["key1", "key2", "key3"]);
  });

  it("should auto-clear keys after default delay (3000ms)", () => {
    const { result } = renderHook(() => useUploadTracker());

    act(() => {
      result.current.trackUpload(["key1", "key2"]);
    });

    expect(result.current.recentlyUploadedKeys).toEqual(["key1", "key2"]);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.recentlyUploadedKeys).toEqual([]);
  });

  it("should use custom delay when provided", () => {
    const { result } = renderHook(() => useUploadTracker(1000));

    act(() => {
      result.current.trackUpload(["key1"]);
    });

    expect(result.current.recentlyUploadedKeys).toEqual(["key1"]);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.recentlyUploadedKeys).toEqual([]);
  });

  it("should only clear keys that were tracked in the same batch", () => {
    const { result } = renderHook(() => useUploadTracker(1000));

    act(() => {
      result.current.trackUpload(["key1"]);
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    act(() => {
      result.current.trackUpload(["key2"]);
    });

    // After 500ms more (1000ms total from key1)
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // key1 should be cleared, key2 should remain
    expect(result.current.recentlyUploadedKeys).toEqual(["key2"]);

    // After another 500ms (1000ms from key2)
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.recentlyUploadedKeys).toEqual([]);
  });

  it("should manually clear specific keys", () => {
    const { result } = renderHook(() => useUploadTracker());

    act(() => {
      result.current.trackUpload(["key1", "key2", "key3"]);
    });

    act(() => {
      result.current.clearKeys(["key2"]);
    });

    expect(result.current.recentlyUploadedKeys).toEqual(["key1", "key3"]);
  });

  it("should cleanup timers on unmount", () => {
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

    const { result, unmount } = renderHook(() => useUploadTracker());

    act(() => {
      result.current.trackUpload(["key1"]);
    });

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
