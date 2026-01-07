import { useState, useMemo } from "react";
import { useIdentityId } from "../../hooks/useIdentityId";
import { useStoragePath } from "../../hooks/useStoragePath";
import { useUploadTracker } from "../../hooks/useUploadTracker";
import { useStorageOperations } from "../../hooks/useStorageOperations";
import { useSelection } from "../../hooks/useSelection";
import { useMoveDialog } from "../../hooks/useMoveDialog";
import { useSortOrder } from "../../hooks/useSortOrder";
import { sortStorageItems } from "../../hooks/sortStorageItems";
import type { StorageItem } from "../../types/storage";
import { Header } from "./Header";
import { FileList } from "./FileList";
import { FileActions } from "./FileActions";
import { CreateFolderDialog } from "./CreateFolderDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { PreviewModal } from "./PreviewModal";
import { RenameDialog } from "./RenameDialog";
import { MoveDialog } from "./MoveDialog";
import { SortSelector } from "./SortSelector";
import { isPreviewable } from "../../utils/fileTypes";
import "./MediaBrowser.css";

interface MediaBrowserProps {
  onSignOut: () => void;
  onOpenSettings?: () => void;
}

export function MediaBrowser({ onSignOut, onOpenSettings }: MediaBrowserProps) {
  // Individual hooks
  const { identityId, loading: identityLoading, error: identityError } = useIdentityId();

  const { currentPath, navigate, goBack } = useStoragePath();

  const { recentlyUploadedKeys } = useUploadTracker();

  const {
    items,
    loading: storageLoading,
    error: storageError,
    removeItem,
    removeItems,
    isDeleting,
    createFolder,
    refresh,
    getFileUrl,
    renameItem,
    renameFolder,
    moveItems,
    listFolders,
  } = useStorageOperations({ identityId, currentPath });

  // Selection management
  const itemKeys = useMemo(() => items.map((item) => item.key), [items]);
  const {
    isSelectionMode,
    selectedKeys,
    selectedCount,
    isAllSelected,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelection,
    toggleSelectAll,
  } = useSelection({ itemKeys });

  // Move dialog management
  const {
    isOpen: isMoveDialogOpen,
    itemsToMove,
    openMoveDialog,
    closeMoveDialog,
  } = useMoveDialog();

  // Sort order management
  const { sortOrder, setSortOrder } = useSortOrder();

  // Apply sort order to items
  const sortedItems = useMemo(() => sortStorageItems(items, sortOrder), [items, sortOrder]);

  // Aggregate loading and error states
  const loading = identityLoading || storageLoading;
  const error = identityError || storageError;

  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [previewItem, setPreviewItem] = useState<StorageItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [renameTarget, setRenameTarget] = useState<StorageItem | null>(null);

  // Get selected items for deletion/move
  const selectedItems = useMemo(
    () => sortedItems.filter((item) => selectedKeys.has(item.key)),
    [sortedItems, selectedKeys],
  );

  const handleFileClick = (item: StorageItem) => {
    if (isPreviewable(item.name)) {
      setPreviewItem(item);
    }
  };

  const handleDeleteFromPreview = async (item: StorageItem) => {
    await removeItem(item.key);
    setPreviewItem(null);
  };

  const handleDeleteSelected = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    await removeItems(selectedItems);
    setShowDeleteConfirm(false);
    exitSelectionMode();
  };

  const handleRename = async (item: StorageItem) => {
    // リネームダイアログを開く前に最新のアイテムリストを取得
    // これにより、前回のリネーム操作後の古いステートによる誤検知を防ぐ
    await refresh();
    setRenameTarget(item);
  };

  const handleCloseRenameDialog = () => {
    setRenameTarget(null);
  };

  // 単一アイテムの移動（FileActionMenuから呼ばれる）
  const handleMoveItem = (item: StorageItem) => {
    openMoveDialog([item]);
  };

  // 一括移動（Headerの移動ボタンから呼ばれる）
  const handleMoveSelected = () => {
    if (selectedItems.length > 0) {
      openMoveDialog(selectedItems);
    }
  };

  // 移動完了時の処理
  const handleMoveComplete = async () => {
    closeMoveDialog();
    await refresh();
    exitSelectionMode();
  };

  // MoveDialog用のrootPath
  const rootPath = identityId ? `media/${identityId}/` : "";
  const fullCurrentPath = currentPath ? `${rootPath}${currentPath}/` : rootPath;

  if (error) {
    return (
      <div className="media-browser-error">
        <p>エラーが発生しました: {error.message}</p>
        <button onClick={refresh}>再試行</button>
      </div>
    );
  }

  return (
    <div className="media-browser">
      <Header
        currentPath={currentPath}
        onBack={goBack}
        onSignOut={onSignOut}
        isSelectionMode={isSelectionMode}
        selectedCount={selectedCount}
        totalCount={items.length}
        isAllSelected={isAllSelected}
        onEnterSelectionMode={enterSelectionMode}
        onExitSelectionMode={exitSelectionMode}
        onToggleSelectAll={toggleSelectAll}
        onMoveSelected={handleMoveSelected}
        onDeleteSelected={handleDeleteSelected}
        onOpenSettings={onOpenSettings}
      />

      <main className="media-browser-content">
        {!loading && !isSelectionMode && (
          <div className="media-browser-toolbar">
            <div className="media-browser-toolbar-left">
              <FileActions
                currentPath={currentPath}
                identityId={identityId}
                onUploadComplete={refresh}
                onCreateFolder={() => setShowCreateFolder(true)}
                items={items}
              />
            </div>
            <div className="media-browser-toolbar-right">
              <SortSelector currentOrder={sortOrder} onChange={setSortOrder} />
            </div>
          </div>
        )}
        {loading ? (
          <div className="media-browser-loading">
            <p>読み込み中...</p>
          </div>
        ) : (
          <FileList
            items={sortedItems}
            onFolderClick={navigate}
            onFileClick={handleFileClick}
            recentlyUploadedKeys={recentlyUploadedKeys}
            isSelectionMode={isSelectionMode}
            selectedKeys={selectedKeys}
            onToggleSelection={toggleSelection}
            onRename={handleRename}
            onMove={handleMoveItem}
          />
        )}
      </main>

      <CreateFolderDialog
        isOpen={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        onCreate={async (name) => {
          await createFolder(name);
          // createFolder 内で fetchItems を呼んでいるが、React の state 更新が
          // コミットされる前にダイアログが閉じると items が反映されない可能性がある。
          // refresh を await することで確実に最新の状態を取得する。
          await refresh();
        }}
      />

      <PreviewModal
        isOpen={previewItem !== null}
        onClose={() => setPreviewItem(null)}
        item={previewItem}
        getFileUrl={getFileUrl}
        onDelete={handleDeleteFromPreview}
        onRename={async (item) => {
          setPreviewItem(null);
          await refresh();
          setRenameTarget(item);
        }}
        onMove={(item) => {
          setPreviewItem(null);
          openMoveDialog([item]);
        }}
      />

      {showDeleteConfirm && (
        <DeleteConfirmDialog
          items={selectedItems}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
        />
      )}

      {renameTarget && (
        <RenameDialog
          isOpen={renameTarget !== null}
          item={renameTarget}
          existingItems={sortedItems}
          onClose={handleCloseRenameDialog}
          onRenameFile={renameItem}
          onRenameFolder={renameFolder}
        />
      )}

      <MoveDialog
        isOpen={isMoveDialogOpen}
        items={itemsToMove}
        currentPath={fullCurrentPath}
        rootPath={rootPath}
        onClose={handleMoveComplete}
        onMove={moveItems}
        listFolders={listFolders}
      />
    </div>
  );
}

export { Header } from "./Header";
export { FileList } from "./FileList";
export { FileActions } from "./FileActions";
export { CreateFolderDialog } from "./CreateFolderDialog";
export { PreviewModal } from "./PreviewModal";
