import { useCallback, useRef } from "react";

export interface UseLongPressOptions<T> {
  /** 長押し完了時のコールバック */
  onLongPress: (data: T) => void;
  /** 長押し判定時間（ms） */
  delay?: number;
  /** 移動キャンセル閾値（px） */
  moveThreshold?: number;
}

export interface UseLongPressReturn {
  /** イベントハンドラオブジェクト */
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerUp: () => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerLeave: () => void;
  };
}

/**
 * 長押しジェスチャーを検出するカスタムフック
 *
 * @param data - 長押し完了時にコールバックに渡すデータ
 * @param options - 長押し検出のオプション
 * @returns イベントハンドラオブジェクト
 */
export function useLongPress<T>(data: T, options: UseLongPressOptions<T>): UseLongPressReturn {
  const { onLongPress, delay = 400, moveThreshold = 10 } = options;

  const timerRef = useRef<number | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const isCancelledRef = useRef(false);
  const dataRef = useRef(data);

  // dataが変更されても最新値を参照できるようにする
  dataRef.current = data;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const triggerHapticFeedback = useCallback(() => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(50);
      } catch {
        // Vibration APIがサポートされていない場合は無視
      }
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      isCancelledRef.current = false;
      startPosRef.current = { x: e.clientX, y: e.clientY };

      timerRef.current = window.setTimeout(() => {
        if (!isCancelledRef.current) {
          triggerHapticFeedback();
          onLongPress(dataRef.current);
        }
      }, delay);
    },
    [delay, onLongPress, triggerHapticFeedback],
  );

  const onPointerUp = useCallback(() => {
    clearTimer();
    isCancelledRef.current = true;
    startPosRef.current = null;
  }, [clearTimer]);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!startPosRef.current) return;

      const dx = Math.abs(e.clientX - startPosRef.current.x);
      const dy = Math.abs(e.clientY - startPosRef.current.y);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > moveThreshold) {
        clearTimer();
        isCancelledRef.current = true;
      }
    },
    [moveThreshold, clearTimer],
  );

  const onPointerLeave = useCallback(() => {
    clearTimer();
    isCancelledRef.current = true;
    startPosRef.current = null;
  }, [clearTimer]);

  return {
    handlers: {
      onPointerDown,
      onPointerUp,
      onPointerMove,
      onPointerLeave,
    },
  };
}
