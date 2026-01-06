import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStoragePath } from "./useStoragePath";

describe("useStoragePath", () => {
  const originalLocation = window.location;
  const originalHistory = window.history;

  beforeEach(() => {
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

  it("should initialize with empty path at root", () => {
    const { result } = renderHook(() => useStoragePath());

    expect(result.current.currentPath).toBe("");
  });

  it("should initialize path from URL query parameter", () => {
    vi.stubGlobal("location", {
      ...originalLocation,
      href: "http://localhost/?path=folder1%2Ffolder2",
      search: "?path=folder1%2Ffolder2",
    });

    const { result } = renderHook(() => useStoragePath());

    expect(result.current.currentPath).toBe("folder1/folder2");
  });

  it("should navigate to folder and update URL", () => {
    const { result } = renderHook(() => useStoragePath());

    act(() => {
      result.current.navigate("folder1");
    });

    expect(result.current.currentPath).toBe("folder1");
    expect(window.history.pushState).toHaveBeenCalledWith(
      { path: "folder1" },
      "",
      expect.stringContaining("path=folder1"),
    );
  });

  it("should navigate to nested folder", () => {
    const { result } = renderHook(() => useStoragePath());

    act(() => {
      result.current.navigate("folder1");
    });

    act(() => {
      result.current.navigate("folder2");
    });

    expect(result.current.currentPath).toBe("folder1/folder2");
  });

  it("should go back to parent folder", () => {
    vi.stubGlobal("location", {
      ...originalLocation,
      href: "http://localhost/?path=folder1%2Ffolder2",
      search: "?path=folder1%2Ffolder2",
    });

    const { result } = renderHook(() => useStoragePath());

    act(() => {
      result.current.goBack();
    });

    expect(result.current.currentPath).toBe("folder1");
  });

  it("should go back to root from single folder", () => {
    vi.stubGlobal("location", {
      ...originalLocation,
      href: "http://localhost/?path=folder1",
      search: "?path=folder1",
    });

    const { result } = renderHook(() => useStoragePath());

    act(() => {
      result.current.goBack();
    });

    expect(result.current.currentPath).toBe("");
  });

  it("should respond to popstate event", () => {
    const { result } = renderHook(() => useStoragePath());

    act(() => {
      result.current.navigate("folder1");
    });

    expect(result.current.currentPath).toBe("folder1");

    // Simulate browser back button
    vi.stubGlobal("location", {
      ...originalLocation,
      href: "http://localhost/",
      search: "",
    });

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: { path: "" } }));
    });

    expect(result.current.currentPath).toBe("");
  });

  it("should handle Japanese folder names", () => {
    const japanesePath = "写真/旅行";
    const encodedPath = encodeURIComponent(japanesePath);
    vi.stubGlobal("location", {
      ...originalLocation,
      href: `http://localhost/?path=${encodedPath}`,
      search: `?path=${encodedPath}`,
    });

    const { result } = renderHook(() => useStoragePath());

    expect(result.current.currentPath).toBe(japanesePath);
  });
});
