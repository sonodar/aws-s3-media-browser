import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import type { StorageItem } from "../../types/storage";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

describe("DeleteConfirmDialog", () => {
  const mockFiles: StorageItem[] = [
    { key: "file1.jpg", name: "file1.jpg", type: "file", size: 1024 },
    { key: "file2.png", name: "file2.png", type: "file", size: 2048 },
  ];

  const mockFolder: StorageItem = {
    key: "folder1/",
    name: "folder1",
    type: "folder",
  };

  describe("単一アイテム削除", () => {
    it("単一ファイル削除時にファイル名が表示される", () => {
      render(<DeleteConfirmDialog items={[mockFiles[0]]} onClose={vi.fn()} onConfirm={vi.fn()} />, {
        wrapper,
      });

      expect(screen.getByText(/file1\.jpg/)).toBeInTheDocument();
    });

    it("単一フォルダ削除時にフォルダ警告が表示される", () => {
      render(<DeleteConfirmDialog items={[mockFolder]} onClose={vi.fn()} onConfirm={vi.fn()} />, {
        wrapper,
      });

      expect(screen.getByText(/フォルダ内のすべてのファイルも削除されます/)).toBeInTheDocument();
    });
  });

  describe("複数アイテム削除", () => {
    it("複数アイテム削除時にアイテム数が表示される", () => {
      render(<DeleteConfirmDialog items={mockFiles} onClose={vi.fn()} onConfirm={vi.fn()} />, {
        wrapper,
      });

      expect(screen.getByText(/2件/)).toBeInTheDocument();
    });

    it("フォルダが含まれる場合にフォルダ警告が表示される", () => {
      render(
        <DeleteConfirmDialog
          items={[...mockFiles, mockFolder]}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />,
        { wrapper },
      );

      expect(screen.getByText(/フォルダ内のすべてのファイルも削除されます/)).toBeInTheDocument();
    });

    it("フォルダが含まれない場合にフォルダ警告が表示されない", () => {
      render(<DeleteConfirmDialog items={mockFiles} onClose={vi.fn()} onConfirm={vi.fn()} />, {
        wrapper,
      });

      expect(
        screen.queryByText(/フォルダ内のすべてのファイルも削除されます/),
      ).not.toBeInTheDocument();
    });
  });

  describe("ダイアログ動作", () => {
    it("削除ボタンクリックで onConfirm が呼ばれる", async () => {
      const onConfirm = vi.fn().mockResolvedValue(undefined);
      render(<DeleteConfirmDialog items={mockFiles} onClose={vi.fn()} onConfirm={onConfirm} />, {
        wrapper,
      });

      fireEvent.click(screen.getByRole("button", { name: /削除/ }));

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalled();
      });
    });

    it("キャンセルボタンクリックで onClose が呼ばれる", () => {
      const onClose = vi.fn();
      render(<DeleteConfirmDialog items={mockFiles} onClose={onClose} onConfirm={vi.fn()} />, {
        wrapper,
      });

      fireEvent.click(screen.getByRole("button", { name: /キャンセル/ }));

      expect(onClose).toHaveBeenCalled();
    });

    it("items が空の場合は何も表示されない", () => {
      // MantineProvider を使わない（wrapper 使用時は style タグが挿入される）
      const { container } = render(
        <DeleteConfirmDialog items={[]} onClose={vi.fn()} onConfirm={vi.fn()} />,
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe("削除処理中の状態", () => {
    it("isDeleting が true の場合、ボタンが無効化される", () => {
      render(
        <DeleteConfirmDialog
          items={mockFiles}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          isDeleting={true}
        />,
        { wrapper },
      );

      expect(screen.getByRole("button", { name: /削除中/ })).toBeDisabled();
      expect(screen.getByRole("button", { name: /キャンセル/ })).toBeDisabled();
    });

    it("isDeleting が true の場合、削除中のテキストが表示される", () => {
      render(
        <DeleteConfirmDialog
          items={mockFiles}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          isDeleting={true}
        />,
        { wrapper },
      );

      expect(screen.getByText(/削除中/)).toBeInTheDocument();
    });
  });

  describe("アクセシビリティ", () => {
    it("ダイアログが alertdialog ロールを持つ", () => {
      render(<DeleteConfirmDialog items={mockFiles} onClose={vi.fn()} onConfirm={vi.fn()} />, {
        wrapper,
      });

      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    it("ダイアログに aria-labelledby が設定されている", () => {
      render(<DeleteConfirmDialog items={mockFiles} onClose={vi.fn()} onConfirm={vi.fn()} />, {
        wrapper,
      });

      const dialog = screen.getByRole("alertdialog");
      expect(dialog).toHaveAttribute("aria-labelledby", "delete-dialog-title");
    });

    it("ダイアログ表示時にキャンセルボタンにフォーカスが当たる", () => {
      render(<DeleteConfirmDialog items={mockFiles} onClose={vi.fn()} onConfirm={vi.fn()} />, {
        wrapper,
      });

      expect(document.activeElement).toBe(screen.getByRole("button", { name: /キャンセル/ }));
    });

    it("Escape キーでダイアログが閉じる", () => {
      const onClose = vi.fn();
      render(<DeleteConfirmDialog items={mockFiles} onClose={onClose} onConfirm={vi.fn()} />, {
        wrapper,
      });

      fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
      expect(onClose).toHaveBeenCalled();
    });
  });
});
