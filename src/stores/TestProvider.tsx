import type { ReactNode } from "react";
import type { WritableAtom } from "jotai";
import { Provider } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { MantineProvider } from "@mantine/core";

/**
 * テスト用の atom 初期値ペア型
 * [atom, initialValue] の形式
 */
// biome-ignore lint/suspicious/noExplicitAny: Jotai atoms have complex generic types
type AtomValuePair = readonly [WritableAtom<any, any, any>, unknown];

type TestProviderProps = {
  children: ReactNode;
};

/**
 * テスト用の Jotai Provider
 *
 * - テストごとに独立した atom スコープを提供
 * - DevTools は含まない（テスト環境では不要）
 * - 各テストで新しいインスタンスを使用することで状態分離を保証
 */
export function TestProvider({ children }: TestProviderProps) {
  return (
    <MantineProvider>
      <Provider>{children}</Provider>
    </MantineProvider>
  );
}

type HydrateAtomsProps = {
  initialValues: AtomValuePair[];
  children: ReactNode;
};

/**
 * atom に初期値を注入するコンポーネント
 */
function HydrateAtoms({ initialValues, children }: HydrateAtomsProps) {
  useHydrateAtoms(initialValues);
  return children;
}

/**
 * 初期値を持つテスト用 Provider を作成するファクトリ関数
 *
 * @example
 * ```tsx
 * const countAtom = atom(0);
 * const TestProviderWithValues = createTestProvider([
 *   [countAtom, 42],
 * ]);
 *
 * renderHook(() => useAtomValue(countAtom), {
 *   wrapper: TestProviderWithValues,
 * });
 * ```
 */
export function createTestProvider(initialValues: AtomValuePair[]) {
  return function TestProviderWithInitialValues({ children }: TestProviderProps) {
    return (
      <MantineProvider>
        <Provider>
          <HydrateAtoms initialValues={initialValues}>{children}</HydrateAtoms>
        </Provider>
      </MantineProvider>
    );
  };
}
