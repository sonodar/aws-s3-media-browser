import { useState, useMemo } from 'react';
import { useIdentityId } from '../../hooks/useIdentityId';
import { useStoragePath } from '../../hooks/useStoragePath';
import { useUploadTracker } from '../../hooks/useUploadTracker';
import { useStorageOperations } from '../../hooks/useStorageOperations';
import { useSelection } from '../../hooks/useSelection';
import type { StorageItem } from '../../types/storage';
import { Header } from './Header';
import { FileList } from './FileList';
import { FileActions } from './FileActions';
import { CreateFolderDialog } from './CreateFolderDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { PreviewModal } from './PreviewModal';
import { isPreviewable } from '../../utils/fileTypes';
import './MediaBrowser.css';

interface MediaBrowserProps {
  onSignOut: () => void;
  onOpenSettings?: () => void;
}

export function MediaBrowser({ onSignOut, onOpenSettings }: MediaBrowserProps) {
  // Individual hooks
  const {
    identityId,
    loading: identityLoading,
    error: identityError,
  } = useIdentityId();

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

  // Aggregate loading and error states
  const loading = identityLoading || storageLoading;
  const error = identityError || storageError;

  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [previewItem, setPreviewItem] = useState<StorageItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Get selected items for deletion
  const selectedItems = useMemo(
    () => items.filter((item) => selectedKeys.has(item.key)),
    [items, selectedKeys]
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
        isAllSelected={isAllSelected}
        onEnterSelectionMode={enterSelectionMode}
        onExitSelectionMode={exitSelectionMode}
        onToggleSelectAll={toggleSelectAll}
        onDeleteSelected={handleDeleteSelected}
        onOpenSettings={onOpenSettings}
      />

      <main className="media-browser-content">
        {loading ? (
          <div className="media-browser-loading">
            <p>読み込み中...</p>
          </div>
        ) : (
          <FileList
            items={items}
            onFolderClick={navigate}
            onFileClick={handleFileClick}
            recentlyUploadedKeys={recentlyUploadedKeys}
            isSelectionMode={isSelectionMode}
            selectedKeys={selectedKeys}
            onToggleSelection={toggleSelection}
          />
        )}
      </main>

      <FileActions
        currentPath={currentPath}
        identityId={identityId}
        onUploadComplete={refresh}
        onCreateFolder={() => setShowCreateFolder(true)}
      />

      <CreateFolderDialog
        isOpen={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        onCreate={createFolder}
      />

      <PreviewModal
        isOpen={previewItem !== null}
        onClose={() => setPreviewItem(null)}
        item={previewItem}
        getFileUrl={getFileUrl}
        onDelete={handleDeleteFromPreview}
      />

      {showDeleteConfirm && (
        <DeleteConfirmDialog
          items={selectedItems}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}

export { Header } from './Header';
export { FileList } from './FileList';
export { FileActions } from './FileActions';
export { CreateFolderDialog } from './CreateFolderDialog';
export { PreviewModal } from './PreviewModal';
