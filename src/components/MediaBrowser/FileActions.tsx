import { useState, useCallback, useRef } from "react";
import { FileUploader } from "@aws-amplify/ui-react-storage";
import { FolderPlus, Upload, X } from "lucide-react";
import type { StorageItem } from "../../types/storage";
import { generateUniqueFilename } from "../../utils/generateUniqueFilename";
import "./FileActions.css";

interface FileActionsProps {
  currentPath: string;
  identityId: string | null;
  onUploadComplete: () => void;
  onCreateFolder: () => void;
  /** 現在のフォルダ内の既存アイテム（重複チェック用） */
  items?: StorageItem[];
}

export function FileActions({
  currentPath,
  identityId,
  onUploadComplete,
  onCreateFolder,
  items = [],
}: FileActionsProps) {
  const [showUploader, setShowUploader] = useState(false);

  // 複数ファイルアップロード時に同一ファイル名が選択された場合に備えて
  // このアップロードセッション中に使用したファイル名を追跡
  const pendingFilenamesRef = useRef<Set<string>>(new Set());

  /**
   * アップロード前にファイル名の重複をチェックし、必要に応じてリネームする
   */
  const processFile = useCallback(
    async ({ file, key }: { file: File; key: string }) => {
      // 既存アイテムからファイル名リストを取得（ファイルのみ）
      const existingNames = items.filter((item) => item.type === "file").map((item) => item.name);

      // このセッションで既に処理済みのファイル名も含める
      const allExistingNames = [...existingNames, ...pendingFilenamesRef.current];

      // ファイル名を取得（キーの最後の部分）
      const originalFilename = key.split("/").pop() || file.name;

      // 一意なファイル名を生成
      const result = generateUniqueFilename({
        originalName: originalFilename,
        existingNames: allExistingNames,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // 処理済みファイル名として追跡
      pendingFilenamesRef.current.add(result.filename!);

      // ファイル名が変わった場合はキーを更新
      if (result.renamed) {
        const pathParts = key.split("/");
        pathParts[pathParts.length - 1] = result.filename!;
        return { file, key: pathParts.join("/") };
      }

      return { file, key };
    },
    [items],
  );

  /**
   * アップロード完了時にペンディングリストをクリア
   */
  const handleUploadSuccess = useCallback(() => {
    pendingFilenamesRef.current.clear();
    onUploadComplete();
    setShowUploader(false);
  }, [onUploadComplete]);

  // すべてのフックが呼び出された後に早期リターン
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
              processFile={processFile}
              onUploadSuccess={handleUploadSuccess}
            />
          </div>
        </div>
      )}
    </div>
  );
}
