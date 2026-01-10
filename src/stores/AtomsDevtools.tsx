import type { ReactNode } from "react";
import { useAtomsDevtools } from "jotai-devtools/utils";

type AtomsDevtoolsProps = {
  children: ReactNode;
};

/**
 * Redux DevTools と Jotai アトムを連携するラッパーコンポーネント
 *
 * - Provider 直下で useAtomsDevtools フックを呼び出す
 * - Redux DevTools 拡張機能で全アトムの状態を確認可能
 * - Time-travel debugging をサポート
 * - Redux DevTools 未インストール時もエラーなく動作
 */
export function AtomsDevtools({ children }: AtomsDevtoolsProps) {
  useAtomsDevtools("aws-s3-photo-browser");
  return children;
}
