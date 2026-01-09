import { useState, useMemo, useCallback } from "react";
import { useIdentityId } from "../../hooks/useIdentityId";
import { useStoragePath } from "../../hooks/useStoragePath";
import { useUploadTracker } from "../../hooks/useUploadTracker";
import { useSwipeNavigation } from "../../hooks/useSwipeNavigation";
import { useStorageOperations } from "../../hooks/useStorageOperations";
import { useSelection } from "../../hooks/useSelection";
import { useMoveDialog } from "../../hooks/useMoveDialog";
import { useSortOrder } from "../../hooks/useSortOrder";
import { sortStorageItems } from "../../hooks/sortStorageItems";
import type { StorageItem } from "../../types/storage";
import { Header } from "./Header";
import { FileList, type ActionMenuData } from "./FileList";
import { FileActions } from "./FileActions";
import { CreateFolderDialog } from "./CreateFolderDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { PreviewModal } from "./PreviewModal";
import { RenameDialog } from "./RenameDialog";
import { MoveDialog } from "./MoveDialog";
import { SortSelector } from "./SortSelector";
import { ContextMenu } from "./ContextMenu";
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
    dialogKey: moveDialogKey,
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

  // Swipe navigation for back gesture
  const {
    bind: swipeBind,
    offsetX,
    isSwiping,
  } = useSwipeNavigation({
    onSwipeBack: goBack,
    isAtRoot: currentPath === "",
  });

  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // RenameDialog state with key for remount（禁止用途 useEffect 排除のため）
  const [renameDialogState, setRenameDialogState] = useState<{
    target: StorageItem | null;
    key: number;
  }>({ target: null, key: 0 });

  // Filter previewable items for multi-slide mode
  const previewableItems = useMemo(
    () => sortedItems.filter((item) => isPreviewable(item.name)),
    [sortedItems],
  );

  // ContextMenu state for long press
  const [contextMenuState, setContextMenuState] = useState<{
    isOpen: boolean;
    item: StorageItem | null;
    position: { x: number; y: number };
  }>({
    isOpen: false,
    item: null,
    position: { x: 0, y: 0 },
  });

  // Get selected items for deletion/move
  const selectedItems = useMemo(
    () => sortedItems.filter((item) => selectedKeys.has(item.key)),
    [sortedItems, selectedKeys],
  );

  const handleFileClick = (item: StorageItem) => {
    if (isPreviewable(item.name)) {
      const index = previewableItems.findIndex((previewable) => previewable.key === item.key);
      if (index !== -1) {
        setCurrentPreviewIndex(index);
      }
    }
  };

  const handleDeleteFromPreview = async (item: StorageItem) => {
    await removeItem(item.key);
    setCurrentPreviewIndex(null);
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
    // 新しい key を生成してダイアログを再マウント
    setRenameDialogState((prev) => ({ target: item, key: prev.key + 1 }));
  };

  const handleCloseRenameDialog = () => {
    setRenameDialogState((prev) => ({ ...prev, target: null }));
  };

  // 単一アイテムの移動（FileActionMenuから呼ばれる）
  const handleMoveItem = (item: StorageItem) => {
    openMoveDialog([item]);
  };

  // ContextMenu handlers for long press
  const handleShowActionMenu = useCallback((data: ActionMenuData) => {
    setContextMenuState({
      isOpen: true,
      item: data.item,
      position: data.position,
    });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenuState({
      isOpen: false,
      item: null,
      position: { x: 0, y: 0 },
    });
  }, []);

  const handleContextMenuRename = useCallback(() => {
    if (contextMenuState.item) {
      handleRename(contextMenuState.item);
    }
  }, [contextMenuState.item]);

  const handleContextMenuMove = useCallback(() => {
    if (contextMenuState.item) {
      handleMoveItem(contextMenuState.item);
    }
  }, [contextMenuState.item]);

  const handleContextMenuDelete = useCallback(async () => {
    if (contextMenuState.item) {
      await removeItem(contextMenuState.item.key);
      await refresh();
    }
  }, [contextMenuState.item, removeItem, refresh]);

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

      <main
        className={`media-browser-content${isSwiping ? " media-browser-content--swiping" : ""}`}
        {...swipeBind()}
        style={{
          transform: isSwiping && offsetX > 0 ? `translateX(${offsetX}px)` : undefined,
        }}
      >
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
            onShowActionMenu={handleShowActionMenu}
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
        isOpen={currentPreviewIndex !== null}
        onClose={() => setCurrentPreviewIndex(null)}
        items={previewableItems}
        currentIndex={currentPreviewIndex ?? 0}
        onIndexChange={setCurrentPreviewIndex}
        getFileUrl={getFileUrl}
        onDelete={handleDeleteFromPreview}
        onRename={async (item) => {
          setCurrentPreviewIndex(null);
          await refresh();
          setRenameDialogState((prev) => ({ target: item, key: prev.key + 1 }));
        }}
        onMove={(item) => {
          setCurrentPreviewIndex(null);
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

      {renameDialogState.target && (
        <RenameDialog
          key={renameDialogState.key}
          isOpen={renameDialogState.target !== null}
          item={renameDialogState.target}
          existingItems={sortedItems}
          onClose={handleCloseRenameDialog}
          onRenameFile={renameItem}
          onRenameFolder={renameFolder}
        />
      )}

      <MoveDialog
        key={moveDialogKey}
        isOpen={isMoveDialogOpen}
        items={itemsToMove}
        currentPath={fullCurrentPath}
        rootPath={rootPath}
        onClose={handleMoveComplete}
        onMove={moveItems}
        listFolders={listFolders}
      />

      <ContextMenu
        isOpen={contextMenuState.isOpen}
        item={contextMenuState.item}
        position={contextMenuState.position}
        onClose={handleCloseContextMenu}
        onRename={handleContextMenuRename}
        onMove={handleContextMenuMove}
        onDelete={handleContextMenuDelete}
      />
    </div>
  );
}

export { Header } from "./Header";
export { FileList } from "./FileList";
export { FileActions } from "./FileActions";
export { CreateFolderDialog } from "./CreateFolderDialog";
export { PreviewModal } from "./PreviewModal";
