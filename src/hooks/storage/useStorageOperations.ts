import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { remove } from "aws-amplify/storage";
import { buildMediaBasePath } from "../../utils/storagePathUtils";
import { useStorageItems } from "./useStorageItems";
import { queryKeys } from "../../stores/queryKeys";
import {
  useUploadMutation,
  useDeleteMutation,
  useMoveMutation,
  useRenameMutation,
  useCreateFolderMutation,
} from "./mutations";
import type { StorageItem } from "../../types/storage";
import type {
  MoveResult,
  MoveProgress,
  RenameResult,
  RenameProgress,
  DeleteResult,
} from "./mutations";

export interface UseStorageOperationsProps {
  identityId: string | null;
  currentPath: string;
}

export type { DeleteResult, RenameResult, MoveResult, MoveProgress, RenameProgress };

/**
 * 単一ファイルリネームの結果
 */
export interface RenameItemResult {
  success: boolean;
  error?: string;
  warning?: string;
}

/**
 * フォルダリネームの結果
 */
export interface RenameFolderResult {
  success: boolean;
  error?: string;
  succeeded?: number;
  failed?: number;
  failedFiles?: string[];
  duplicates?: string[];
}

export interface UseStorageOperationsReturn {
  items: StorageItem[];
  loading: boolean;
  error: Error | null;
  uploadFiles: (files: File[]) => Promise<string[]>;
  removeItem: (key: string) => Promise<void>;
  /**
   * 複数アイテムを削除する
   * フォルダが含まれる場合は list で配下コンテンツを取得し一括削除
   */
  removeItems: (items: StorageItem[]) => Promise<DeleteResult>;
  /** 削除処理中フラグ */
  isDeleting: boolean;
  createFolder: (name: string) => Promise<void>;
  refresh: () => Promise<void>;
  /**
   * 単一ファイルをリネームする
   * @param currentKey 現在のS3オブジェクトキー
   * @param newName 新しいファイル名（パスなし）
   */
  renameItem: (currentKey: string, newName: string) => Promise<RenameItemResult>;
  /**
   * フォルダをリネームする
   * @param currentPrefix 現在のフォルダプレフィックス（末尾/あり）
   * @param newName 新しいフォルダ名（末尾/なし）
   * @param onProgress 進捗コールバック
   */
  renameFolder: (
    currentPrefix: string,
    newName: string,
    onProgress?: (progress: RenameProgress) => void,
  ) => Promise<RenameFolderResult>;
  /** リネーム処理中フラグ */
  isRenaming: boolean;
  /**
   * ファイル/フォルダを別のフォルダに移動する
   * @param items 移動対象アイテム
   * @param destinationPath 移動先フォルダパス
   * @param onProgress 進捗コールバック
   */
  moveItems: (
    items: StorageItem[],
    destinationPath: string,
    onProgress?: (progress: MoveProgress) => void,
  ) => Promise<MoveResult>;
  /** 移動処理中フラグ */
  isMoving: boolean;
}

/**
 * S3 ストレージ操作を提供するフック
 */
export function useStorageOperations({
  identityId,
  currentPath,
}: UseStorageOperationsProps): UseStorageOperationsReturn {
  const queryClient = useQueryClient();

  // TanStack Query を使用したストレージアイテム取得
  const { data: items, isLoading: loading, error } = useStorageItems(identityId, currentPath);

  // Mutation コンテキスト
  const mutationContext = {
    identityId: identityId ?? "",
    currentPath,
  };

  // Mutation フックの初期化
  const uploadMutation = useUploadMutation(mutationContext);
  const deleteMutation = useDeleteMutation(mutationContext);
  const moveMutation = useMoveMutation(mutationContext);
  const renameMutation = useRenameMutation(mutationContext);
  const createFolderMutation = useCreateFolderMutation(mutationContext);

  const getBasePath = useCallback(() => {
    if (!identityId) return null;
    return buildMediaBasePath(identityId, currentPath);
  }, [identityId, currentPath]);

  /**
   * キャッシュを無効化してアイテム一覧を再取得
   */
  const invalidateItems = useCallback(async () => {
    if (!identityId) return;
    await queryClient.invalidateQueries({
      queryKey: queryKeys.items(identityId, currentPath),
    });
  }, [queryClient, identityId, currentPath]);

  const uploadFiles = useCallback(
    async (files: File[]): Promise<string[]> => {
      const basePath = getBasePath();
      if (!basePath) return [];

      return uploadMutation.mutateAsync({ files, basePath });
    },
    [getBasePath, uploadMutation],
  );

  const removeItem = useCallback(
    async (key: string) => {
      await remove({ path: key });
      await invalidateItems();
    },
    [invalidateItems],
  );

  /**
   * 複数アイテムを削除する
   * フォルダが含まれる場合は配下コンテンツも一括削除
   */
  const removeItems = useCallback(
    async (itemsToDelete: StorageItem[]): Promise<DeleteResult> => {
      return deleteMutation.mutateAsync({ items: itemsToDelete });
    },
    [deleteMutation],
  );

  const createFolder = useCallback(
    async (name: string) => {
      const basePath = getBasePath();
      if (!basePath) return;

      await createFolderMutation.mutateAsync({ name, basePath });
    },
    [getBasePath, createFolderMutation],
  );

  const refresh = useCallback((): Promise<void> => {
    return invalidateItems();
  }, [invalidateItems]);

  /**
   * 単一ファイルをリネームする
   */
  const renameItem = useCallback(
    async (currentKey: string, newName: string): Promise<RenameItemResult> => {
      const result = await renameMutation.mutateAsync({
        currentKey,
        newName,
        isFolder: false,
      });
      return {
        success: result.success,
        error: result.error,
        warning: result.warning,
      };
    },
    [renameMutation],
  );

  /**
   * フォルダをリネームする
   */
  const renameFolder = useCallback(
    async (
      currentPrefix: string,
      newName: string,
      onProgress?: (progress: RenameProgress) => void,
    ): Promise<RenameFolderResult> => {
      const result = await renameMutation.mutateAsync({
        currentKey: currentPrefix,
        newName,
        isFolder: true,
        onProgress,
      });
      return {
        success: result.success,
        error: result.error,
        succeeded: result.succeeded,
        failed: result.failed,
        failedFiles: result.failedFiles,
        duplicates: result.duplicates,
      };
    },
    [renameMutation],
  );

  /**
   * ファイル/フォルダを別のフォルダに移動する
   */
  const moveItems = useCallback(
    async (
      itemsToMove: StorageItem[],
      destinationPath: string,
      onProgress?: (progress: MoveProgress) => void,
    ): Promise<MoveResult> => {
      return moveMutation.mutateAsync({
        items: itemsToMove,
        destinationPath,
        onProgress,
      });
    },
    [moveMutation],
  );

  return {
    items,
    loading,
    error,
    uploadFiles,
    removeItem,
    removeItems,
    isDeleting: deleteMutation.isPending,
    createFolder,
    refresh,
    renameItem,
    renameFolder,
    isRenaming: renameMutation.isPending,
    moveItems,
    isMoving: moveMutation.isPending,
  };
}
