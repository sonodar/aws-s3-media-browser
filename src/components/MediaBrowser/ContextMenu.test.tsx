import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContextMenu } from "./ContextMenu";
import type { StorageItem } from "../../types/storage";

describe("ContextMenu", () => {
  const mockItem: StorageItem = {
    key: "test-file.jpg",
    name: "test-file.jpg",
    isFolder: false,
    path: "photos/test-file.jpg",
    size: 1024,
    lastModified: new Date(),
  };

  const defaultProps = {
    isOpen: true,
    item: mockItem,
    position: { x: 100, y: 100 },
    onClose: vi.fn(),
    onRename: vi.fn(),
    onMove: vi.fn(),
    onDelete: vi.fn(),
  };

  describe("表示/非表示", () => {
    it("isOpen が true の場合にメニューが表示される", () => {
      render(<ContextMenu {...defaultProps} />);

      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("isOpen が false の場合にメニューが表示されない", () => {
      render(<ContextMenu {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("item が null の場合にメニューが表示されない", () => {
      render(<ContextMenu {...defaultProps} item={null} />);

      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  describe("メニュー項目", () => {
    it("名前を変更ボタンが表示される", () => {
      render(<ContextMenu {...defaultProps} />);

      expect(screen.getByRole("menuitem", { name: /名前を変更/i })).toBeInTheDocument();
    });

    it("移動ボタンが表示される", () => {
      render(<ContextMenu {...defaultProps} />);

      expect(screen.getByRole("menuitem", { name: /移動/i })).toBeInTheDocument();
    });

    it("削除ボタンが表示される", () => {
      render(<ContextMenu {...defaultProps} />);

      expect(screen.getByRole("menuitem", { name: /削除/i })).toBeInTheDocument();
    });
  });

  describe("アクション実行", () => {
    it("名前を変更をクリックすると onRename が呼ばれる", () => {
      const onRename = vi.fn();
      render(<ContextMenu {...defaultProps} onRename={onRename} />);

      fireEvent.click(screen.getByRole("menuitem", { name: /名前を変更/i }));

      expect(onRename).toHaveBeenCalledTimes(1);
    });

    it("移動をクリックすると onMove が呼ばれる", () => {
      const onMove = vi.fn();
      render(<ContextMenu {...defaultProps} onMove={onMove} />);

      fireEvent.click(screen.getByRole("menuitem", { name: /移動/i }));

      expect(onMove).toHaveBeenCalledTimes(1);
    });

    it("削除をクリックすると onDelete が呼ばれる", () => {
      const onDelete = vi.fn();
      render(<ContextMenu {...defaultProps} onDelete={onDelete} />);

      fireEvent.click(screen.getByRole("menuitem", { name: /削除/i }));

      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it("アクション実行後に onClose が呼ばれる", () => {
      const onClose = vi.fn();
      render(<ContextMenu {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByRole("menuitem", { name: /名前を変更/i }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("外部クリック", () => {
    it("メニュー外をクリックすると onClose が呼ばれる", () => {
      const onClose = vi.fn();
      render(
        <div>
          <div data-testid="outside">Outside</div>
          <ContextMenu {...defaultProps} onClose={onClose} />
        </div>,
      );

      fireEvent.mouseDown(screen.getByTestId("outside"));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("位置", () => {
    it("指定された position に表示される", () => {
      render(<ContextMenu {...defaultProps} position={{ x: 150, y: 200 }} />);

      const menu = screen.getByRole("menu");
      expect(menu).toHaveStyle({ left: "150px", top: "200px" });
    });
  });
});
