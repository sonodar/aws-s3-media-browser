import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLongPress } from "./useLongPress";

describe("useLongPress", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("基本的な長押し検出", () => {
    it("長押し完了時にonLongPressが呼ばれる", () => {
      const onLongPress = vi.fn();
      const testData = { id: "test-item" };
      const { result } = renderHook(() => useLongPress(testData, { onLongPress }));

      const mockEvent = {
        clientX: 100,
        clientY: 100,
        preventDefault: vi.fn(),
      } as unknown as React.PointerEvent;

      act(() => {
        result.current.handlers.onPointerDown(mockEvent);
      });

      act(() => {
        vi.advanceTimersByTime(400);
      });

      expect(onLongPress).toHaveBeenCalledWith(testData);
      expect(onLongPress).toHaveBeenCalledTimes(1);
    });

    it("delay未満でポインターを離すとonLongPressは呼ばれない", () => {
      const onLongPress = vi.fn();
      const testData = { id: "test-item" };
      const { result } = renderHook(() => useLongPress(testData, { onLongPress }));

      const mockEvent = {
        clientX: 100,
        clientY: 100,
        preventDefault: vi.fn(),
      } as unknown as React.PointerEvent;

      act(() => {
        result.current.handlers.onPointerDown(mockEvent);
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      act(() => {
        result.current.handlers.onPointerUp();
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(onLongPress).not.toHaveBeenCalled();
    });
  });

  describe("delayオプション", () => {
    it("カスタムdelayを設定できる", () => {
      const onLongPress = vi.fn();
      const testData = { id: "test-item" };
      const { result } = renderHook(() => useLongPress(testData, { onLongPress, delay: 500 }));

      const mockEvent = {
        clientX: 100,
        clientY: 100,
        preventDefault: vi.fn(),
      } as unknown as React.PointerEvent;

      act(() => {
        result.current.handlers.onPointerDown(mockEvent);
      });

      act(() => {
        vi.advanceTimersByTime(400);
      });

      expect(onLongPress).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(onLongPress).toHaveBeenCalledWith(testData);
    });
  });

  describe("移動によるキャンセル", () => {
    it("移動量がmoveThresholdを超えるとキャンセルされる", () => {
      const onLongPress = vi.fn();
      const testData = { id: "test-item" };
      const { result } = renderHook(() =>
        useLongPress(testData, { onLongPress, moveThreshold: 10 }),
      );

      const mockDownEvent = {
        clientX: 100,
        clientY: 100,
        preventDefault: vi.fn(),
      } as unknown as React.PointerEvent;

      const mockMoveEvent = {
        clientX: 115,
        clientY: 100,
        preventDefault: vi.fn(),
      } as unknown as React.PointerEvent;

      act(() => {
        result.current.handlers.onPointerDown(mockDownEvent);
      });

      act(() => {
        result.current.handlers.onPointerMove(mockMoveEvent);
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(onLongPress).not.toHaveBeenCalled();
    });

    it("移動量がmoveThreshold以内であればキャンセルされない", () => {
      const onLongPress = vi.fn();
      const testData = { id: "test-item" };
      const { result } = renderHook(() =>
        useLongPress(testData, { onLongPress, moveThreshold: 10 }),
      );

      const mockDownEvent = {
        clientX: 100,
        clientY: 100,
        preventDefault: vi.fn(),
      } as unknown as React.PointerEvent;

      const mockMoveEvent = {
        clientX: 105,
        clientY: 103,
        preventDefault: vi.fn(),
      } as unknown as React.PointerEvent;

      act(() => {
        result.current.handlers.onPointerDown(mockDownEvent);
      });

      act(() => {
        result.current.handlers.onPointerMove(mockMoveEvent);
      });

      act(() => {
        vi.advanceTimersByTime(400);
      });

      expect(onLongPress).toHaveBeenCalledWith(testData);
    });
  });

  describe("ポインターリーブによるキャンセル", () => {
    it("onPointerLeaveで長押しがキャンセルされる", () => {
      const onLongPress = vi.fn();
      const testData = { id: "test-item" };
      const { result } = renderHook(() => useLongPress(testData, { onLongPress }));

      const mockEvent = {
        clientX: 100,
        clientY: 100,
        preventDefault: vi.fn(),
      } as unknown as React.PointerEvent;

      act(() => {
        result.current.handlers.onPointerDown(mockEvent);
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      act(() => {
        result.current.handlers.onPointerLeave();
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(onLongPress).not.toHaveBeenCalled();
    });
  });

  describe("データの受け渡し", () => {
    it("異なるデータを正しくonLongPressに渡す", () => {
      const onLongPress = vi.fn();
      const testData = { id: "item-123", name: "Test File" };
      const { result } = renderHook(() => useLongPress(testData, { onLongPress }));

      const mockEvent = {
        clientX: 100,
        clientY: 100,
        preventDefault: vi.fn(),
      } as unknown as React.PointerEvent;

      act(() => {
        result.current.handlers.onPointerDown(mockEvent);
      });

      act(() => {
        vi.advanceTimersByTime(400);
      });

      expect(onLongPress).toHaveBeenCalledWith({
        id: "item-123",
        name: "Test File",
      });
    });
  });
});
