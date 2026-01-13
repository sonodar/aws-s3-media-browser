import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./queryClient";

type QueryProviderProps = {
  children: ReactNode;
};

/**
 * TanStack Query の QueryClient を提供する Provider
 *
 * - QueryClient インスタンスを作成し、アプリ全体で共有
 * - 開発環境では ReactQueryDevtools を表示
 * - 本番ビルドでは DevTools コードを除外
 */
export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
