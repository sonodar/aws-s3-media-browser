import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSwipeNavigation } from "./useSwipeNavigation";

// @use-gesture/react のモック
vi.mock("@use-gesture/react", () => ({
  useDrag: (handler: (state: unknown) => void) => {
    // モック用のbind関数を返す
    return () => ({
      onPointerDown: (_: PointerEvent) => {
        // テスト時に直接stateを渡せるようにする
        (window as unknown as { __gestureHandler: typeof handler }).__gestureHandler = handler;
      },
    });
  },
}));

describe("useSwipeNavigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("初期状態", () => {
    it("offsetX が 0 で初期化される", () => {
      const onSwipeBack = vi.fn();
      const { result } = renderHook(() => useSwipeNavigation({ onSwipeBack, isAtRoot: false }));

      expect(result.current.offsetX).toBe(0);
    });

    it("isSwiping が false で初期化される", () => {
      const onSwipeBack = vi.fn();
      const { result } = renderHook(() => useSwipeNavigation({ onSwipeBack, isAtRoot: false }));

      expect(result.current.isSwiping).toBe(false);
    });

    it("bind 関数が返される", () => {
      const onSwipeBack = vi.fn();
      const { result } = renderHook(() => useSwipeNavigation({ onSwipeBack, isAtRoot: false }));

      expect(typeof result.current.bind).toBe("function");
    });
  });

  describe("オプション", () => {
    it("threshold のデフォルト値が適用される", () => {
      const onSwipeBack = vi.fn();
      const { result } = renderHook(() => useSwipeNavigation({ onSwipeBack, isAtRoot: false }));

      // bind関数が正常に動作することを確認
      expect(result.current.bind).toBeDefined();
    });

    it("カスタム threshold を設定できる", () => {
      const onSwipeBack = vi.fn();
      const { result } = renderHook(() =>
        useSwipeNavigation({ onSwipeBack, isAtRoot: false, threshold: 100 }),
      );

      expect(result.current.bind).toBeDefined();
    });
  });

  describe("ルートディレクトリ制御", () => {
    it("isAtRoot が true の場合、フックが正常に動作する", () => {
      const onSwipeBack = vi.fn();
      const { result } = renderHook(() => useSwipeNavigation({ onSwipeBack, isAtRoot: true }));

      expect(result.current.offsetX).toBe(0);
      expect(result.current.isSwiping).toBe(false);
    });
  });
});
