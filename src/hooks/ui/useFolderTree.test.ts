import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { useFolderTree } from "./useFolderTree";
import type { StorageItem } from "../../types/storage";

// Mock useStorageItems hook
vi.mock("../storage", async () => {
  const actual = await vi.importActual("../storage");
  return {
    ...actual,
    useStorageItems: vi.fn(),
  };
});

import { useStorageItems } from "../storage";

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });

const createWrapper = () => {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

describe("useFolderTree", () => {
  const mockUseStorageItems = vi.mocked(useStorageItems);
  const identityId = "user123";
  const rootPath = "";
  const currentPath = "";
  const disabledPaths: string[] = [];

  const sampleFolders: StorageItem[] = [
    { key: "media/user123/photos/", name: "photos", type: "folder" },
    { key: "media/user123/archive/", name: "archive", type: "folder" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStorageItems.mockReturnValue({
      data: sampleFolders,
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  describe("toTreeNodeData utility", () => {
    it("should convert StorageItem to TreeNodeData", async () => {
      const { result } = renderHook(
        () =>
          useFolderTree({
            identityId,
            rootPath,
            currentPath,
            disabledPaths,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.treeData.length).toBeGreaterThan(0);
      });

      // ルートノードが存在する
      expect(result.current.treeData[0]).toMatchObject({
        value: rootPath,
        label: "ホーム",
      });
    });

    it("should create tree node with folder path as value", async () => {
      const { result } = renderHook(
        () =>
          useFolderTree({
            identityId,
            rootPath,
            currentPath,
            disabledPaths,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        const rootNode = result.current.treeData[0];
        expect(rootNode?.children).toBeDefined();
      });
    });
  });

  describe("initial tree data", () => {
    it("should start with root folder", async () => {
      const { result } = renderHook(
        () =>
          useFolderTree({
            identityId,
            rootPath,
            currentPath,
            disabledPaths,
          }),
        { wrapper: createWrapper() },
      );

      expect(result.current.treeData).toHaveLength(1);
      expect(result.current.treeData[0].value).toBe(rootPath);
    });

    it("should expand root by default and show children", async () => {
      const { result } = renderHook(
        () =>
          useFolderTree({
            identityId,
            rootPath,
            currentPath,
            disabledPaths,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        const rootNode = result.current.treeData[0];
        expect(rootNode.children?.length).toBe(2);
      });
    });

    it("should call useStorageItems with correct parameters", async () => {
      renderHook(
        () =>
          useFolderTree({
            identityId,
            rootPath,
            currentPath,
            disabledPaths,
          }),
        { wrapper: createWrapper() },
      );

      expect(mockUseStorageItems).toHaveBeenCalledWith(identityId, rootPath);
    });
  });

  describe("selectedPath", () => {
    it("should start with null selectedPath", async () => {
      const { result } = renderHook(
        () =>
          useFolderTree({
            identityId,
            rootPath,
            currentPath,
            disabledPaths,
          }),
        { wrapper: createWrapper() },
      );

      expect(result.current.selectedPath).toBeNull();
    });
  });

  describe("isDisabled", () => {
    it("should return true for paths in disabledPaths", async () => {
      const { result } = renderHook(
        () =>
          useFolderTree({
            identityId,
            rootPath,
            currentPath: "media/user123/",
            disabledPaths: ["media/user123/photos/"],
          }),
        { wrapper: createWrapper() },
      );

      expect(result.current.isDisabled("media/user123/photos/")).toBe(true);
      expect(result.current.isDisabled("media/user123/archive/")).toBe(false);
    });

    it("should return true for currentPath", async () => {
      const { result } = renderHook(
        () =>
          useFolderTree({
            identityId,
            rootPath,
            currentPath: "media/user123/current/",
            disabledPaths: [],
          }),
        { wrapper: createWrapper() },
      );

      expect(result.current.isDisabled("media/user123/current/")).toBe(true);
    });

    it("should return true for subpaths of disabledPaths", async () => {
      const { result } = renderHook(
        () =>
          useFolderTree({
            identityId,
            rootPath,
            currentPath: "",
            disabledPaths: ["media/user123/photos/"],
          }),
        { wrapper: createWrapper() },
      );

      // photos 配下のサブフォルダも無効
      expect(result.current.isDisabled("media/user123/photos/2024/")).toBe(true);
    });
  });

  describe("toggleExpanded", () => {
    it("should toggle expanded state of a node", async () => {
      const { result } = renderHook(
        () =>
          useFolderTree({
            identityId,
            rootPath,
            currentPath,
            disabledPaths,
          }),
        { wrapper: createWrapper() },
      );

      // ルートは最初から展開されている
      expect(result.current.tree.expandedState[rootPath]).toBe(true);

      // ルートを折りたたむ
      act(() => {
        result.current.toggleExpanded(rootPath);
      });

      expect(result.current.tree.expandedState[rootPath]).toBe(false);

      // 再度展開
      act(() => {
        result.current.toggleExpanded(rootPath);
      });

      expect(result.current.tree.expandedState[rootPath]).toBe(true);
    });

    it("should expose tree controller for expansion management", async () => {
      const { result } = renderHook(
        () =>
          useFolderTree({
            identityId,
            rootPath,
            currentPath,
            disabledPaths,
          }),
        { wrapper: createWrapper() },
      );

      expect(result.current.tree).toBeDefined();
      expect(result.current.tree.toggleExpanded).toBeInstanceOf(Function);
      expect(result.current.tree.expand).toBeInstanceOf(Function);
      expect(result.current.tree.collapse).toBeInstanceOf(Function);
    });
  });

  describe("selectNode", () => {
    it("should update selectedPath when node is selected", async () => {
      const { result } = renderHook(
        () =>
          useFolderTree({
            identityId,
            rootPath,
            currentPath,
            disabledPaths,
          }),
        { wrapper: createWrapper() },
      );

      act(() => {
        result.current.selectNode("media/user123/photos/");
      });

      expect(result.current.selectedPath).toBe("media/user123/photos/");
    });

    it("should not update selectedPath when disabled node is selected", async () => {
      const { result } = renderHook(
        () =>
          useFolderTree({
            identityId,
            rootPath,
            currentPath: "media/user123/current/",
            disabledPaths: ["media/user123/photos/"],
          }),
        { wrapper: createWrapper() },
      );

      // 無効なパスを選択しようとしても変わらない
      act(() => {
        result.current.selectNode("media/user123/photos/");
      });

      expect(result.current.selectedPath).toBeNull();

      // 有効なパスなら変わる
      act(() => {
        result.current.selectNode("media/user123/archive/");
      });

      expect(result.current.selectedPath).toBe("media/user123/archive/");
    });
  });
});
