import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAtomValue, useSetAtom } from "jotai";
import { createTestProvider } from "../TestProvider";
import {
  // Primitive atoms
  currentPathAtom,
  // Derived atoms
  pathSegmentsAtom,
  parentPathAtom,
  // Action atoms
  navigateAtom,
  goBackAtom,
  setPathAtom,
} from "./path";

// Task 2.2: Path Atoms のテスト

describe("Path Atoms", () => {
  describe("Primitive Atoms", () => {
    describe("currentPathAtom", () => {
      it("has empty string as initial value", () => {
        const { result } = renderHook(() => useAtomValue(currentPathAtom), {
          wrapper: createTestProvider([]),
        });

        expect(result.current).toBe("");
      });

      it("can be set to a path", () => {
        const { result } = renderHook(
          () => ({
            path: useAtomValue(currentPathAtom),
            setPath: useSetAtom(setPathAtom),
          }),
          { wrapper: createTestProvider([]) },
        );

        act(() => {
          result.current.setPath("photos/2024");
        });

        expect(result.current.path).toBe("photos/2024");
      });
    });
  });

  describe("Derived Atoms", () => {
    describe("pathSegmentsAtom", () => {
      it("returns empty array for empty path", () => {
        const { result } = renderHook(() => useAtomValue(pathSegmentsAtom), {
          wrapper: createTestProvider([]),
        });

        expect(result.current).toEqual([]);
      });

      it("returns segments for single folder", () => {
        const TestProvider = createTestProvider([[currentPathAtom, "photos"]]);

        const { result } = renderHook(() => useAtomValue(pathSegmentsAtom), {
          wrapper: TestProvider,
        });

        expect(result.current).toEqual(["photos"]);
      });

      it("returns segments for nested path", () => {
        const TestProvider = createTestProvider([[currentPathAtom, "photos/2024/summer"]]);

        const { result } = renderHook(() => useAtomValue(pathSegmentsAtom), {
          wrapper: TestProvider,
        });

        expect(result.current).toEqual(["photos", "2024", "summer"]);
      });

      it("filters out empty segments", () => {
        const TestProvider = createTestProvider([[currentPathAtom, "photos//2024/"]]);

        const { result } = renderHook(() => useAtomValue(pathSegmentsAtom), {
          wrapper: TestProvider,
        });

        expect(result.current).toEqual(["photos", "2024"]);
      });
    });

    describe("parentPathAtom", () => {
      it("returns empty string for root path", () => {
        const { result } = renderHook(() => useAtomValue(parentPathAtom), {
          wrapper: createTestProvider([]),
        });

        expect(result.current).toBe("");
      });

      it("returns empty string for single folder", () => {
        const TestProvider = createTestProvider([[currentPathAtom, "photos"]]);

        const { result } = renderHook(() => useAtomValue(parentPathAtom), {
          wrapper: TestProvider,
        });

        expect(result.current).toBe("");
      });

      it("returns parent path for nested path", () => {
        const TestProvider = createTestProvider([[currentPathAtom, "photos/2024/summer"]]);

        const { result } = renderHook(() => useAtomValue(parentPathAtom), {
          wrapper: TestProvider,
        });

        expect(result.current).toBe("photos/2024");
      });
    });
  });

  describe("Action Atoms", () => {
    describe("navigateAtom", () => {
      it("appends folder to empty path", () => {
        const { result } = renderHook(
          () => ({
            path: useAtomValue(currentPathAtom),
            navigate: useSetAtom(navigateAtom),
          }),
          { wrapper: createTestProvider([]) },
        );

        act(() => {
          result.current.navigate("photos");
        });

        expect(result.current.path).toBe("photos");
      });

      it("appends folder to existing path", () => {
        const TestProvider = createTestProvider([[currentPathAtom, "photos"]]);

        const { result } = renderHook(
          () => ({
            path: useAtomValue(currentPathAtom),
            navigate: useSetAtom(navigateAtom),
          }),
          { wrapper: TestProvider },
        );

        act(() => {
          result.current.navigate("2024");
        });

        expect(result.current.path).toBe("photos/2024");
      });
    });

    describe("goBackAtom", () => {
      it("does nothing when at root", () => {
        const { result } = renderHook(
          () => ({
            path: useAtomValue(currentPathAtom),
            goBack: useSetAtom(goBackAtom),
          }),
          { wrapper: createTestProvider([]) },
        );

        act(() => {
          result.current.goBack();
        });

        expect(result.current.path).toBe("");
      });

      it("goes to root from single folder", () => {
        const TestProvider = createTestProvider([[currentPathAtom, "photos"]]);

        const { result } = renderHook(
          () => ({
            path: useAtomValue(currentPathAtom),
            goBack: useSetAtom(goBackAtom),
          }),
          { wrapper: TestProvider },
        );

        act(() => {
          result.current.goBack();
        });

        expect(result.current.path).toBe("");
      });

      it("goes to parent from nested path", () => {
        const TestProvider = createTestProvider([[currentPathAtom, "photos/2024/summer"]]);

        const { result } = renderHook(
          () => ({
            path: useAtomValue(currentPathAtom),
            goBack: useSetAtom(goBackAtom),
          }),
          { wrapper: TestProvider },
        );

        act(() => {
          result.current.goBack();
        });

        expect(result.current.path).toBe("photos/2024");
      });
    });

    describe("setPathAtom", () => {
      it("sets path directly", () => {
        const { result } = renderHook(
          () => ({
            path: useAtomValue(currentPathAtom),
            setPath: useSetAtom(setPathAtom),
          }),
          { wrapper: createTestProvider([]) },
        );

        act(() => {
          result.current.setPath("photos/2024/summer");
        });

        expect(result.current.path).toBe("photos/2024/summer");
      });

      it("can set to empty string (root)", () => {
        const TestProvider = createTestProvider([[currentPathAtom, "photos/2024"]]);

        const { result } = renderHook(
          () => ({
            path: useAtomValue(currentPathAtom),
            setPath: useSetAtom(setPathAtom),
          }),
          { wrapper: TestProvider },
        );

        act(() => {
          result.current.setPath("");
        });

        expect(result.current.path).toBe("");
      });
    });
  });

  describe("Debug Labels", () => {
    it("has debugLabel on currentPathAtom", () => {
      expect(currentPathAtom.debugLabel).toBe("path/current");
    });

    it("has debugLabel on pathSegmentsAtom", () => {
      expect(pathSegmentsAtom.debugLabel).toBe("path/segments");
    });

    it("has debugLabel on parentPathAtom", () => {
      expect(parentPathAtom.debugLabel).toBe("path/parent");
    });
  });
});
