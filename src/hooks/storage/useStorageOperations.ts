import { useState, useEffect, useCallback } from "react";
import { list, remove, uploadData, getUrl, copy } from "aws-amplify/storage";
import { buildRenamedKey, buildRenamedPrefix, encodePathForCopy } from "../../utils/pathUtils";
import { parseStorageItems } from "./parseStorageItems";
import type { StorageItem } from "../../types/storage";

export interface UseStorageOperationsProps {
  identityId: string | null;
  currentPath: string;
}

/**
 * 削除操作の結果
 */
export interface DeleteResult {
  /** 削除に成功したキー */
  succeeded: string[];
  /** 削除に失敗したキーとエラー */
  failed: Array<{ key: string; error: Error }>;
}

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

/**
 * フォルダリネームの進捗情報
 */
export interface RenameProgress {
  current: number;
  total: number;
}

/**
 * 移動操作の結果
 */
export interface MoveResult {
  success: boolean;
  succeeded: number;
  failed: number;
  failedItems?: string[];
  duplicates?: string[];
  error?: string;
}

/**
 * 移動操作の進捗情報
 */
export interface MoveProgress {
  current: number;
  total: number;
}

/** フォルダリネーム時の最大アイテム数 */
const MAX_FOLDER_RENAME_ITEMS = 1000;

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
  getFileUrl: (key: string) => Promise<string>;
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
  /**
   * 指定パス配下のフォルダ一覧を取得する
   * @param path 取得対象パス
   */
  listFolders: (path: string) => Promise<StorageItem[]>;
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
  const [items, setItems] = useState<StorageItem[]>([]);
  // Start loading if identityId is provided (will fetch on mount)
  const [loading, setLoading] = useState(!!identityId);
  const [error, setError] = useState<Error | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  const getBasePath = useCallback(() => {
    if (!identityId) return null;
    const base = `media/${identityId}/`;
    return currentPath ? `${base}${currentPath}/` : base;
  }, [identityId, currentPath]);

  const fetchItems = useCallback(async () => {
    const basePath = getBasePath();
    if (!basePath) return;

    setLoading(true);
    setError(null);

    try {
      const result = await list({
        path: basePath,
        options: { listAll: true },
      });

      const parsed = parseStorageItems(result.items, basePath);
      setItems(parsed);
    } catch (err: unknown) {
      console.error("Failed to fetch storage items:", err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [getBasePath]);

  // Fetch items when identityId or currentPath changes
  useEffect(() => {
    if (identityId) {
      fetchItems();
    }
  }, [identityId, currentPath, fetchItems]);

  const uploadFiles = useCallback(
    async (files: File[]): Promise<string[]> => {
      const basePath = getBasePath();
      if (!basePath) return [];

      const uploadedKeys = files.map((file) => `${basePath}${file.name}`);

      await Promise.all(
        files.map((file) =>
          uploadData({
            path: `${basePath}${file.name}`,
            data: file,
          }),
        ),
      );

      await fetchItems();
      return uploadedKeys;
    },
    [getBasePath, fetchItems],
  );

  const removeItem = useCallback(
    async (key: string) => {
      await remove({ path: key });
      await fetchItems();
    },
    [fetchItems],
  );

  /**
   * フォルダ配下のすべてのファイルキーを取得する
   */
  const listFolderContents = useCallback(async (folderKey: string): Promise<string[]> => {
    const result = await list({
      path: folderKey,
      options: { listAll: true },
    });
    return result.items.map((item) => item.path);
  }, []);

  /**
   * 複数アイテムを削除する
   * フォルダが含まれる場合は配下コンテンツも一括削除
   */
  const removeItems = useCallback(
    async (itemsToDelete: StorageItem[]): Promise<DeleteResult> => {
      setIsDeleting(true);

      try {
        // 削除対象のすべてのキーを収集
        const allKeysToDelete: string[] = [];

        for (const item of itemsToDelete) {
          if (item.type === "folder") {
            // フォルダの場合は配下コンテンツを取得
            const folderContents = await listFolderContents(item.key);
            allKeysToDelete.push(...folderContents);
            // フォルダオブジェクト自体も削除対象に追加
            allKeysToDelete.push(item.key);
          } else {
            allKeysToDelete.push(item.key);
          }
        }

        // 重複を除去
        const uniqueKeys = [...new Set(allKeysToDelete)];

        // 並列で削除を実行
        const results = await Promise.allSettled(
          uniqueKeys.map(async (key) => {
            await remove({ path: key });
            return key;
          }),
        );

        // 結果を分類
        const succeeded: string[] = [];
        const failed: Array<{ key: string; error: Error }> = [];

        results.forEach((result, index) => {
          const key = uniqueKeys[index];
          if (result.status === "fulfilled") {
            succeeded.push(key);
          } else {
            failed.push({ key, error: result.reason as Error });
          }
        });

        // 削除後にリストを更新
        await fetchItems();

        return { succeeded, failed };
      } finally {
        setIsDeleting(false);
      }
    },
    [listFolderContents, fetchItems],
  );

  const createFolder = useCallback(
    async (name: string) => {
      const basePath = getBasePath();
      if (!basePath) return;

      const folderPath = `${basePath}${name}/`;
      await uploadData({
        path: folderPath,
        data: "",
      });
      await fetchItems();
    },
    [getBasePath, fetchItems],
  );

  const getFileUrl = useCallback(async (key: string): Promise<string> => {
    const result = await getUrl({ path: key });
    return result.url.toString();
  }, []);

  const refresh = useCallback((): Promise<void> => {
    return fetchItems();
  }, [fetchItems]);

  /**
   * 単一ファイルをリネームする
   */
  const renameItem = useCallback(
    async (currentKey: string, newName: string): Promise<RenameItemResult> => {
      setIsRenaming(true);

      try {
        const newKey = buildRenamedKey(currentKey, newName);

        // S3上で新キーの存在をチェック
        try {
          const existingItems = await list({
            path: newKey,
            options: { listAll: true },
          });
          // ファイルが存在する場合はエラー
          if (existingItems.items.length > 0) {
            return { success: false, error: "同じ名前のファイルが既に存在します" };
          }
        } catch (err: unknown) {
          console.error("Error checking existing file for rename:", err);
          return {
            success: false,
            error: `リネーム前のチェックに失敗しました: ${(err as Error).message}`,
          };
        }

        // コピー実行
        // Amplify の copy API は CopySource ヘッダーを URL エンコードしないため、
        // 日本語などの非ASCII文字を含むパスでエラーが発生する。
        // ソースパスを事前にエンコードすることで回避する。
        try {
          await copy({
            source: { path: encodePathForCopy(currentKey) },
            destination: { path: newKey },
          });
        } catch (err: unknown) {
          console.error("Error copying file for rename:", err);
          return {
            success: false,
            error: `コピーに失敗しました: ${(err as Error).message}`,
          };
        }

        // 元ファイルを削除
        let warning: string | undefined;
        try {
          await remove({ path: currentKey });
        } catch (err: unknown) {
          console.warn("Error deleting file for rename:", err);
          // 削除失敗は警告として扱う（成功扱い）
          warning = `元ファイルの削除に失敗しました: ${(err as Error).message}`;
        }

        // 一覧を更新
        await fetchItems();

        return { success: true, warning };
      } finally {
        setIsRenaming(false);
      }
    },
    [fetchItems],
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
      setIsRenaming(true);

      try {
        const newPrefix = buildRenamedPrefix(currentPrefix, newName);

        // リネーム先の既存オブジェクトを取得
        let targetItems: string[] = [];
        try {
          const targetResult = await list({
            path: newPrefix,
            options: { listAll: true },
          });
          targetItems = targetResult.items.map((item) => item.path);
        } catch {
          // リネーム先が存在しない場合は空として扱う
        }

        // ソースフォルダの内容を取得
        const sourceResult = await list({
          path: currentPrefix,
          options: { listAll: true },
        });
        const sourceItems = sourceResult.items.map((item) => item.path);

        // ファイル数制限チェック
        if (sourceItems.length > MAX_FOLDER_RENAME_ITEMS) {
          return {
            success: false,
            error: `フォルダ内のファイル数が多すぎます（${sourceItems.length}件）。${MAX_FOLDER_RENAME_ITEMS}件以下のフォルダのみリネーム可能です`,
          };
        }

        // 重複チェック（高速パス: リネーム先が空なら重複なし）
        if (targetItems.length > 0) {
          const targetSet = new Set(targetItems);
          const duplicates: string[] = [];

          for (const sourcePath of sourceItems) {
            // ソースパスからリネーム先パスを構築
            const relativePath = sourcePath.slice(currentPrefix.length);
            const destPath = `${newPrefix}${relativePath}`;
            if (targetSet.has(destPath)) {
              duplicates.push(relativePath);
            }
          }

          if (duplicates.length > 0) {
            return {
              success: false,
              error: `重複するファイルが存在します（${duplicates.length}件）`,
              duplicates,
            };
          }
        }

        // コピー＆削除を実行
        const total = sourceItems.length;
        let succeeded = 0;
        let failed = 0;
        const failedFiles: string[] = [];

        for (let i = 0; i < sourceItems.length; i++) {
          const sourcePath = sourceItems[i];
          const relativePath = sourcePath.slice(currentPrefix.length);
          const destPath = `${newPrefix}${relativePath}`;

          try {
            await copy({
              source: { path: encodePathForCopy(sourcePath) },
              destination: { path: destPath },
            });

            // コピー成功したら元ファイルを削除
            try {
              await remove({ path: sourcePath });
            } catch {
              // 削除失敗は無視（ファイルは両方に存在することになる）
            }

            succeeded++;
          } catch (err: unknown) {
            console.error("Error renaming folder item:", err);
            failed++;
            failedFiles.push(relativePath);
          }

          onProgress?.({ current: i + 1, total });
        }

        // 一覧を更新
        await fetchItems();

        if (failed > 0) {
          return {
            success: false,
            succeeded,
            failed,
            failedFiles,
          };
        }

        return { success: true, succeeded, failed: 0 };
      } finally {
        setIsRenaming(false);
      }
    },
    [fetchItems],
  );

  /**
   * 指定パス配下のフォルダ一覧を取得する
   */
  const listFolders = useCallback(async (path: string): Promise<StorageItem[]> => {
    const result = await list({
      path,
      options: { listAll: true },
    });

    // パス直下のフォルダのみを抽出
    const folders: StorageItem[] = [];
    const seen = new Set<string>();

    for (const item of result.items) {
      const relativePath = item.path.slice(path.length);
      const slashIndex = relativePath.indexOf("/");

      if (slashIndex > 0) {
        // フォルダ配下のアイテム → フォルダとして抽出
        const folderName = relativePath.slice(0, slashIndex);
        const folderKey = `${path}${folderName}/`;

        if (!seen.has(folderKey)) {
          seen.add(folderKey);
          folders.push({
            key: folderKey,
            name: folderName,
            type: "folder",
          });
        }
      } else if (relativePath.endsWith("/") && relativePath.length > 0) {
        // フォルダオブジェクト自体
        const folderName = relativePath.slice(0, -1);
        const folderKey = `${path}${folderName}/`;

        if (!seen.has(folderKey)) {
          seen.add(folderKey);
          folders.push({
            key: folderKey,
            name: folderName,
            type: "folder",
          });
        }
      }
    }

    return folders;
  }, []);

  /**
   * ファイル/フォルダを別のフォルダに移動する
   */
  const moveItems = useCallback(
    async (
      itemsToMove: StorageItem[],
      destinationPath: string,
      onProgress?: (progress: MoveProgress) => void,
    ): Promise<MoveResult> => {
      setIsMoving(true);

      // 末尾に / がなければ追加
      const normalizedDestPath = destinationPath.endsWith("/")
        ? destinationPath
        : `${destinationPath}/`;

      try {
        // 移動対象のすべてのファイルを収集
        const allFilesToMove: Array<{
          sourcePath: string;
          destPath: string;
          relativeName: string;
        }> = [];

        for (const item of itemsToMove) {
          if (item.type === "folder") {
            // フォルダの場合は配下コンテンツを取得
            const folderContents = await listFolderContents(item.key);
            for (const sourcePath of folderContents) {
              // フォルダ名を保持して移動先パスを構築
              const folderName = item.name;
              const relativeToFolder = sourcePath.slice(item.key.length);
              const destPath = `${normalizedDestPath}${folderName}/${relativeToFolder}`;
              allFilesToMove.push({
                sourcePath,
                destPath,
                relativeName: `${folderName}/${relativeToFolder}`,
              });
            }
          } else {
            // ファイルの場合
            const destPath = `${normalizedDestPath}${item.name}`;
            allFilesToMove.push({
              sourcePath: item.key,
              destPath,
              relativeName: item.name,
            });
          }
        }

        // 移動先での重複チェック
        const destResult = await list({
          path: normalizedDestPath,
          options: { listAll: true },
        });
        const existingPaths = new Set(destResult.items.map((item) => item.path));
        const duplicates: string[] = [];

        for (const file of allFilesToMove) {
          if (existingPaths.has(file.destPath)) {
            duplicates.push(file.relativeName);
          }
        }

        if (duplicates.length > 0) {
          return {
            success: false,
            succeeded: 0,
            failed: allFilesToMove.length,
            duplicates,
            error: `移動先に同名のファイルが存在します（${duplicates.length}件）`,
          };
        }

        // コピー＆削除を実行
        const total = allFilesToMove.length;
        let succeeded = 0;
        let failed = 0;
        const failedItems: string[] = [];

        for (let i = 0; i < allFilesToMove.length; i++) {
          const { sourcePath, destPath, relativeName } = allFilesToMove[i];

          try {
            await copy({
              source: { path: encodePathForCopy(sourcePath) },
              destination: { path: destPath },
            });

            // コピー成功したら元ファイルを削除
            try {
              await remove({ path: sourcePath });
            } catch {
              // 削除失敗は無視（ファイルは両方に存在することになる）
            }

            succeeded++;
          } catch {
            failed++;
            failedItems.push(relativeName);
          }

          onProgress?.({ current: i + 1, total });
        }

        // 一覧を更新
        await fetchItems();

        if (failed > 0) {
          return {
            success: false,
            succeeded,
            failed,
            failedItems,
          };
        }

        return { success: true, succeeded, failed: 0 };
      } finally {
        setIsMoving(false);
      }
    },
    [listFolderContents, fetchItems],
  );

  return {
    items,
    loading,
    error,
    uploadFiles,
    removeItem,
    removeItems,
    isDeleting,
    createFolder,
    getFileUrl,
    refresh,
    renameItem,
    renameFolder,
    isRenaming,
    moveItems,
    listFolders,
    isMoving,
  };
}
