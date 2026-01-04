import { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useStorage, type StorageItem } from '../../hooks/useStorage';
import { Header } from './Header';
import { FileList } from './FileList';
import { FileActions } from './FileActions';
import { CreateFolderDialog } from './CreateFolderDialog';
import { PreviewModal } from './PreviewModal';
import { isPreviewable } from '../../utils/fileTypes';
import './MediaBrowser.css';

interface MediaBrowserProps {
  onSignOut: () => void;
}

export function MediaBrowser({ onSignOut }: MediaBrowserProps) {
  const {
    items,
    loading,
    error,
    currentPath,
    navigate,
    goBack,
    remove,
    createFolder,
    refresh,
    getFileUrl,
    recentlyUploadedKeys,
  } = useStorage();

  const [identityId, setIdentityId] = useState<string | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [previewItem, setPreviewItem] = useState<StorageItem | null>(null);

  useEffect(() => {
    fetchAuthSession().then((session) => {
      setIdentityId(session.identityId ?? null);
    });
  }, []);

  const handleFileClick = (item: StorageItem) => {
    if (isPreviewable(item.name)) {
      setPreviewItem(item);
    }
  };

  const handleDeleteFromPreview = async (item: StorageItem) => {
    await remove(item.key);
    setPreviewItem(null);
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
    </div>
  );
}

export { Header } from './Header';
export { FileList } from './FileList';
export { FileActions } from './FileActions';
export { CreateFolderDialog } from './CreateFolderDialog';
export { PreviewModal } from './PreviewModal';
