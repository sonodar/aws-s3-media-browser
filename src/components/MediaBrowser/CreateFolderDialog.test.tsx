import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { CreateFolderDialog } from "./CreateFolderDialog";
import type { StorageItem } from "../../types/storage";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

describe("CreateFolderDialog", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onCreate: vi.fn().mockResolvedValue(undefined),
    existingItems: [] as StorageItem[],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("表示状態", () => {
    it("isOpen が true の場合にダイアログが表示される", () => {
      render(<CreateFolderDialog {...defaultProps} />, { wrapper });

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("新しいフォルダを作成")).toBeInTheDocument();
    });

    it("isOpen が false の場合はダイアログが表示されない", () => {
      render(<CreateFolderDialog {...defaultProps} isOpen={false} />, { wrapper });

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("フォーム入力", () => {
    it("フォルダ名入力フィールドが表示される", () => {
      render(<CreateFolderDialog {...defaultProps} />, { wrapper });

      expect(screen.getByPlaceholderText("フォルダ名")).toBeInTheDocument();
    });

    it("フォルダ名を入力できる", () => {
      render(<CreateFolderDialog {...defaultProps} />, { wrapper });

      const input = screen.getByPlaceholderText("フォルダ名");
      fireEvent.change(input, { target: { value: "新しいフォルダ" } });

      expect(input).toHaveValue("新しいフォルダ");
    });
  });

  describe("バリデーション", () => {
    it("空のフォルダ名ではエラーが表示される", async () => {
      render(<CreateFolderDialog {...defaultProps} />, { wrapper });

      const input = screen.getByPlaceholderText("フォルダ名");
      fireEvent.change(input, { target: { value: "  " } });

      const form = input.closest("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText("名前を入力してください")).toBeInTheDocument();
      });
    });

    it("スラッシュを含むフォルダ名ではエラーが表示される", async () => {
      render(<CreateFolderDialog {...defaultProps} />, { wrapper });

      const input = screen.getByPlaceholderText("フォルダ名");
      fireEvent.change(input, { target: { value: "folder/name" } });

      const form = input.closest("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText("名前にスラッシュは使用できません")).toBeInTheDocument();
      });
    });

    it("100文字を超えるフォルダ名ではエラーが表示される", async () => {
      render(<CreateFolderDialog {...defaultProps} />, { wrapper });

      const input = screen.getByPlaceholderText("フォルダ名");
      fireEvent.change(input, { target: { value: "a".repeat(101) } });

      const form = input.closest("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText("名前は100文字以内にしてください")).toBeInTheDocument();
      });
    });

    it("同じ名前のフォルダが存在する場合エラーが表示される", async () => {
      const existingItems: StorageItem[] = [
        { key: "path/existing/", name: "existing", type: "folder" },
      ];
      render(<CreateFolderDialog {...defaultProps} existingItems={existingItems} />, { wrapper });

      const input = screen.getByPlaceholderText("フォルダ名");
      fireEvent.change(input, { target: { value: "existing" } });

      const form = input.closest("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText("同じ名前のフォルダが既に存在します")).toBeInTheDocument();
      });
    });

    it("同じ名前のファイルが存在してもフォルダは作成可能", async () => {
      const onCreate = vi.fn().mockResolvedValue(undefined);
      const existingItems: StorageItem[] = [{ key: "path/photos", name: "photos", type: "file" }];
      render(
        <CreateFolderDialog {...defaultProps} onCreate={onCreate} existingItems={existingItems} />,
        { wrapper },
      );

      const input = screen.getByPlaceholderText("フォルダ名");
      fireEvent.change(input, { target: { value: "photos" } });

      fireEvent.click(screen.getByRole("button", { name: /作成/ }));

      await waitFor(() => {
        expect(onCreate).toHaveBeenCalledWith("photos");
      });
    });

    it("大文字・小文字は区別される（Photos vs photos）", async () => {
      const onCreate = vi.fn().mockResolvedValue(undefined);
      const existingItems: StorageItem[] = [
        { key: "path/photos/", name: "photos", type: "folder" },
      ];
      render(
        <CreateFolderDialog {...defaultProps} onCreate={onCreate} existingItems={existingItems} />,
        { wrapper },
      );

      const input = screen.getByPlaceholderText("フォルダ名");
      fireEvent.change(input, { target: { value: "Photos" } });

      fireEvent.click(screen.getByRole("button", { name: /作成/ }));

      await waitFor(() => {
        expect(onCreate).toHaveBeenCalledWith("Photos");
      });
    });
  });

  describe("ボタン動作", () => {
    it("作成ボタンクリックで onCreate が呼ばれる", async () => {
      const onCreate = vi.fn().mockResolvedValue(undefined);
      render(<CreateFolderDialog {...defaultProps} onCreate={onCreate} />, { wrapper });

      const input = screen.getByPlaceholderText("フォルダ名");
      fireEvent.change(input, { target: { value: "新しいフォルダ" } });

      fireEvent.click(screen.getByRole("button", { name: /作成/ }));

      await waitFor(() => {
        expect(onCreate).toHaveBeenCalledWith("新しいフォルダ");
      });
    });

    it("キャンセルボタンクリックで onClose が呼ばれる", () => {
      const onClose = vi.fn();
      render(<CreateFolderDialog {...defaultProps} onClose={onClose} />, { wrapper });

      fireEvent.click(screen.getByRole("button", { name: /キャンセル/ }));

      expect(onClose).toHaveBeenCalled();
    });

    it("フォルダ名が空の場合は作成ボタンが無効化される", () => {
      render(<CreateFolderDialog {...defaultProps} />, { wrapper });

      expect(screen.getByRole("button", { name: /作成/ })).toBeDisabled();
    });
  });

  describe("作成処理中の状態", () => {
    it("作成中はボタンが無効化される", async () => {
      const onCreate = vi.fn(() => new Promise(() => {})); // 永続的な Promise
      render(<CreateFolderDialog {...defaultProps} onCreate={onCreate} />, { wrapper });

      const input = screen.getByPlaceholderText("フォルダ名");
      fireEvent.change(input, { target: { value: "新しいフォルダ" } });

      fireEvent.click(screen.getByRole("button", { name: /作成/ }));

      await waitFor(() => {
        const submitButton = screen.getByRole("button", { name: /作成/ });
        expect(submitButton).toBeDisabled();
        expect(submitButton).toHaveAttribute("data-loading", "true");
        expect(screen.getByRole("button", { name: /キャンセル/ })).toBeDisabled();
      });
    });

    it("作成中は入力フィールドが無効化される", async () => {
      const onCreate = vi.fn(() => new Promise(() => {}));
      render(<CreateFolderDialog {...defaultProps} onCreate={onCreate} />, { wrapper });

      const input = screen.getByPlaceholderText("フォルダ名");
      fireEvent.change(input, { target: { value: "新しいフォルダ" } });

      fireEvent.click(screen.getByRole("button", { name: /作成/ }));

      await waitFor(() => {
        expect(input).toBeDisabled();
      });
    });
  });

  describe("エラー処理", () => {
    it("作成失敗時にエラーメッセージが表示される", async () => {
      const onCreate = vi.fn().mockRejectedValue(new Error("作成失敗"));
      render(<CreateFolderDialog {...defaultProps} onCreate={onCreate} />, { wrapper });

      const input = screen.getByPlaceholderText("フォルダ名");
      fireEvent.change(input, { target: { value: "新しいフォルダ" } });

      fireEvent.click(screen.getByRole("button", { name: /作成/ }));

      await waitFor(() => {
        expect(screen.getByText("フォルダの作成に失敗しました")).toBeInTheDocument();
      });
    });
  });

  describe("レイアウト構造", () => {
    it("キャンセルボタンと作成ボタンが水平に並んでいる", () => {
      render(<CreateFolderDialog {...defaultProps} />, { wrapper });

      const cancelButton = screen.getByRole("button", { name: /キャンセル/ });
      const submitButton = screen.getByRole("button", { name: /作成/ });

      // 両方のボタンが同じ親要素（Group）内にある
      expect(cancelButton.parentElement).toBe(submitButton.parentElement);
    });
  });

  describe("アクセシビリティ", () => {
    it("ダイアログが dialog ロールを持つ", () => {
      render(<CreateFolderDialog {...defaultProps} />, { wrapper });

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("入力フィールドが適切なラベルを持つ", () => {
      render(<CreateFolderDialog {...defaultProps} />, { wrapper });

      expect(screen.getByLabelText("フォルダ名")).toBeInTheDocument();
    });
  });
});
