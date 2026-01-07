import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FileActions } from "./FileActions";
import type { StorageItem } from "../../types/storage";

// FileUploader をモック
const mockFileUploaderProps = vi.fn();
vi.mock("@aws-amplify/ui-react-storage", () => ({
  FileUploader: (props: Record<string, unknown>) => {
    mockFileUploaderProps(props);
    return <div data-testid="file-uploader">FileUploader Mock</div>;
  },
}));

describe("FileActions", () => {
  const defaultProps = {
    currentPath: "",
    identityId: "test-identity-id",
    onUploadComplete: vi.fn(),
    onCreateFolder: vi.fn(),
    items: [] as StorageItem[],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("processFile による重複チェック", () => {
    it("重複がない場合は元のファイル名でアップロードする", async () => {
      const items: StorageItem[] = [{ type: "file", key: "media/id/other.jpg", name: "other.jpg" }];

      render(<FileActions {...defaultProps} items={items} />);

      // アップロードボタンをクリックしてモーダルを開く
      const uploadButton = screen.getByLabelText("ファイルをアップロード");
      fireEvent.click(uploadButton);

      // FileUploader に渡された props を取得
      expect(mockFileUploaderProps).toHaveBeenCalled();
      const props = mockFileUploaderProps.mock.calls[0][0];
      expect(props.processFile).toBeDefined();

      // processFile を実行（重複なし）
      const result = await props.processFile({
        file: new File(["content"], "photo.jpg", { type: "image/jpeg" }),
        key: "media/test-identity-id/photo.jpg",
      });

      expect(result.key).toBe("media/test-identity-id/photo.jpg");
    });

    it("重複がある場合は連番付きファイル名でアップロードする", async () => {
      const items: StorageItem[] = [{ type: "file", key: "media/id/photo.jpg", name: "photo.jpg" }];

      render(<FileActions {...defaultProps} items={items} />);

      const uploadButton = screen.getByLabelText("ファイルをアップロード");
      fireEvent.click(uploadButton);

      const props = mockFileUploaderProps.mock.calls[0][0];
      const result = await props.processFile({
        file: new File(["content"], "photo.jpg", { type: "image/jpeg" }),
        key: "media/test-identity-id/photo.jpg",
      });

      expect(result.key).toBe("media/test-identity-id/photo (1).jpg");
    });

    it("連番も既に存在する場合は次の連番を使用する", async () => {
      const items: StorageItem[] = [
        { type: "file", key: "media/id/photo.jpg", name: "photo.jpg" },
        { type: "file", key: "media/id/photo (1).jpg", name: "photo (1).jpg" },
      ];

      render(<FileActions {...defaultProps} items={items} />);

      const uploadButton = screen.getByLabelText("ファイルをアップロード");
      fireEvent.click(uploadButton);

      const props = mockFileUploaderProps.mock.calls[0][0];
      const result = await props.processFile({
        file: new File(["content"], "photo.jpg", { type: "image/jpeg" }),
        key: "media/test-identity-id/photo.jpg",
      });

      expect(result.key).toBe("media/test-identity-id/photo (2).jpg");
    });

    it("サブフォルダでの重複チェックが正しく動作する", async () => {
      const items: StorageItem[] = [
        { type: "file", key: "media/id/subfolder/photo.jpg", name: "photo.jpg" },
      ];

      render(<FileActions {...defaultProps} currentPath="subfolder" items={items} />);

      const uploadButton = screen.getByLabelText("ファイルをアップロード");
      fireEvent.click(uploadButton);

      const props = mockFileUploaderProps.mock.calls[0][0];
      const result = await props.processFile({
        file: new File(["content"], "photo.jpg", { type: "image/jpeg" }),
        key: "media/test-identity-id/subfolder/photo.jpg",
      });

      expect(result.key).toBe("media/test-identity-id/subfolder/photo (1).jpg");
    });

    it("長すぎるファイル名でエラーが発生した場合はエラーをスローする", async () => {
      const longName = "a".repeat(96) + ".jpg"; // 100文字ちょうど
      const items: StorageItem[] = [{ type: "file", key: `media/id/${longName}`, name: longName }];

      render(<FileActions {...defaultProps} items={items} />);

      const uploadButton = screen.getByLabelText("ファイルをアップロード");
      fireEvent.click(uploadButton);

      const props = mockFileUploaderProps.mock.calls[0][0];

      await expect(
        props.processFile({
          file: new File(["content"], longName, { type: "image/jpeg" }),
          key: `media/test-identity-id/${longName}`,
        }),
      ).rejects.toThrow();
    });
  });

  describe("既存の動作の維持", () => {
    it("identityId が null の場合は何も表示しない", () => {
      render(<FileActions {...defaultProps} identityId={null} />);
      expect(screen.queryByLabelText("ファイルをアップロード")).not.toBeInTheDocument();
    });

    it("アップロードボタンが表示される", () => {
      render(<FileActions {...defaultProps} />);
      expect(screen.getByLabelText("ファイルをアップロード")).toBeInTheDocument();
    });

    it("フォルダ作成ボタンが表示される", () => {
      render(<FileActions {...defaultProps} />);
      expect(screen.getByLabelText("フォルダを作成")).toBeInTheDocument();
    });
  });
});
