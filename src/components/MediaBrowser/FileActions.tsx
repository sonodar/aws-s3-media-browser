import { useState } from "react";
import { FileUploader } from "@aws-amplify/ui-react-storage";
import { FolderPlus, Upload, X } from "lucide-react";
import "./FileActions.css";

interface FileActionsProps {
  currentPath: string;
  identityId: string | null;
  onUploadComplete: () => void;
  onCreateFolder: () => void;
}

export function FileActions({
  currentPath,
  identityId,
  onUploadComplete,
  onCreateFolder,
}: FileActionsProps) {
  const [showUploader, setShowUploader] = useState(false);

  if (!identityId) return null;

  const getUploadPath = () => {
    const base = `media/${identityId}/`;
    return currentPath ? `${base}${currentPath}/` : base;
  };

  return (
    <div className="file-actions">
      <button
        className="action-button create-folder-button"
        onClick={onCreateFolder}
        aria-label="フォルダを作成"
      >
        <FolderPlus size={24} aria-hidden="true" />
      </button>
      <button
        className="action-button upload-button"
        onClick={() => setShowUploader(!showUploader)}
        aria-label="ファイルをアップロード"
      >
        <Upload size={24} aria-hidden="true" />
      </button>

      {showUploader && (
        <div className="uploader-modal">
          <div className="uploader-backdrop" onClick={() => setShowUploader(false)} />
          <div className="uploader-content">
            <div className="uploader-header">
              <h3>ファイルをアップロード</h3>
              <button
                className="close-button"
                onClick={() => setShowUploader(false)}
                aria-label="閉じる"
              >
                <X size={24} aria-hidden="true" />
              </button>
            </div>
            <FileUploader
              acceptedFileTypes={["image/*", "video/*"]}
              path={getUploadPath()}
              maxFileCount={10}
              isResumable
              onUploadSuccess={() => {
                onUploadComplete();
                setShowUploader(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
