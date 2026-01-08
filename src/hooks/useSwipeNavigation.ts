import { useState, useCallback } from "react";
import { useDrag } from "@use-gesture/react";

export interface UseSwipeNavigationOptions {
  /** 戻るナビゲーション実行関数 */
  onSwipeBack: () => void;
  /** ルートディレクトリかどうか */
  isAtRoot: boolean;
  /** スワイプ検出の水平閾値（px） */
  threshold?: number;
}

export interface UseSwipeNavigationReturn {
  /** bind関数（コンテナ要素にスプレッド） */
  bind: ReturnType<typeof useDrag>;
  /** スワイプ中のX軸オフセット（アニメーション用） */
  offsetX: number;
  /** スワイプ中かどうか */
  isSwiping: boolean;
}

/**
 * 水平スワイプを検出し、左スワイプ時に戻るナビゲーションを実行するカスタムフック
 *
 * @param options - スワイプナビゲーションのオプション
 * @returns bind関数とスワイプ状態
 */
export function useSwipeNavigation(options: UseSwipeNavigationOptions): UseSwipeNavigationReturn {
  const { onSwipeBack, isAtRoot, threshold = 50 } = options;

  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleSwipeBack = useCallback(() => {
    if (!isAtRoot) {
      onSwipeBack();
    }
  }, [isAtRoot, onSwipeBack]);

  const bind = useDrag(
    ({ active, movement: [mx], direction: [dx], swipe: [swipeX] }) => {
      // スワイプ中の状態管理
      setIsSwiping(active);

      // 右方向へのドラッグ（戻るジェスチャー）のみ許可
      if (active && mx > 0) {
        setOffsetX(mx);
      } else if (!active) {
        // ジェスチャー終了時
        if (swipeX === 1 || (mx > threshold && dx > 0)) {
          // 右スワイプ完了（画面上では左から右へ = 戻る）
          handleSwipeBack();
        }
        // リセット
        setOffsetX(0);
      }
    },
    {
      axis: "x",
      filterTaps: true,
      pointer: { touch: true },
      threshold: 10,
    },
  );

  return {
    bind,
    offsetX,
    isSwiping,
  };
}
