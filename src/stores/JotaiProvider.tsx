import type { ReactNode } from "react";
import { Provider } from "jotai";
import { DevTools } from "jotai-devtools";
import "jotai-devtools/styles.css";

type JotaiProviderProps = {
  children: ReactNode;
};

/**
 * アプリケーション全体の Jotai atom スコープを提供する Provider
 *
 * - 全 atoms のスコープを定義
 * - 開発環境でのみ Redux DevTools と連携
 * - 本番ビルドでは DevTools コードを除外
 */
export function JotaiProvider({ children }: JotaiProviderProps) {
  return (
    <Provider>
      {import.meta.env.DEV && <DevTools />}
      {children}
    </Provider>
  );
}
