import type { ReactNode } from "react";
import { Provider } from "jotai";
import { AtomsDevtools } from "./AtomsDevtools";

type JotaiProviderProps = {
  children: ReactNode;
};

/**
 * アプリケーション全体の Jotai atom スコープを提供する Provider
 *
 * - 全 atoms のスコープを定義
 * - 開発環境でのみ Redux DevTools と連携（useAtomsDevtools）
 * - 本番ビルドでは AtomsDevtools コードを除外
 */
export function JotaiProvider({ children }: JotaiProviderProps) {
  return (
    <Provider>
      {import.meta.env.DEV ? <AtomsDevtools>{children}</AtomsDevtools> : children}
    </Provider>
  );
}
