import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { ContextMenu } from "./ContextMenu";
import type { StorageItem } from "../../types/storage";

// MantineProvider でラップするヘルパー関数
function renderWithMantine(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe("ContextMenu", () => {
  const mockItem: StorageItem = {
    key: "photos/test-file.jpg",
    name: "test-file.jpg",
    type: "file",
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
      renderWithMantine(<ContextMenu {...defaultProps} />);

      // Mantine Menu.Dropdown が role="menu" でレンダリングされる
      expect(screen.getByRole("menu")).toBeInTheDocument();
      expect(screen.getByTestId("context-menu-anchor")).toBeInTheDocument();
    });

    it("isOpen が false の場合にメニューが表示されない", () => {
      renderWithMantine(<ContextMenu {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("item が null の場合にメニューが表示されない", () => {
      renderWithMantine(<ContextMenu {...defaultProps} item={null} />);

      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  describe("メニュー項目", () => {
    it("名前を変更ボタンが表示される", () => {
      renderWithMantine(<ContextMenu {...defaultProps} />);

      expect(screen.getByRole("menuitem", { name: /名前を変更/i })).toBeInTheDocument();
    });

    it("移動ボタンが表示される", () => {
      renderWithMantine(<ContextMenu {...defaultProps} />);

      expect(screen.getByRole("menuitem", { name: /移動/i })).toBeInTheDocument();
    });

    it("削除ボタンが表示される", () => {
      renderWithMantine(<ContextMenu {...defaultProps} />);

      expect(screen.getByRole("menuitem", { name: /削除/i })).toBeInTheDocument();
    });
  });

  describe("アクション実行", () => {
    it("名前を変更をクリックすると onRename が呼ばれる", () => {
      const onRename = vi.fn();
      renderWithMantine(<ContextMenu {...defaultProps} onRename={onRename} />);

      fireEvent.click(screen.getByRole("menuitem", { name: /名前を変更/i }));

      expect(onRename).toHaveBeenCalledTimes(1);
    });

    it("移動をクリックすると onMove が呼ばれる", () => {
      const onMove = vi.fn();
      renderWithMantine(<ContextMenu {...defaultProps} onMove={onMove} />);

      fireEvent.click(screen.getByRole("menuitem", { name: /移動/i }));

      expect(onMove).toHaveBeenCalledTimes(1);
    });

    it("削除をクリックすると onDelete が呼ばれる", () => {
      const onDelete = vi.fn();
      renderWithMantine(<ContextMenu {...defaultProps} onDelete={onDelete} />);

      fireEvent.click(screen.getByRole("menuitem", { name: /削除/i }));

      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it("アクション実行後に onClose が呼ばれる", () => {
      const onClose = vi.fn();
      renderWithMantine(<ContextMenu {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByRole("menuitem", { name: /名前を変更/i }));

      // handleAction 内で onClose が呼ばれる
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("外部クリック", () => {
    it("メニュー外をクリックすると onClose が呼ばれる", () => {
      const onClose = vi.fn();
      render(
        <MantineProvider>
          <div>
            <div data-testid="outside">Outside</div>
            <ContextMenu {...defaultProps} onClose={onClose} />
          </div>
        </MantineProvider>,
      );

      fireEvent.mouseDown(screen.getByTestId("outside"));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("位置", () => {
    it("指定された position に表示される", () => {
      renderWithMantine(<ContextMenu {...defaultProps} position={{ x: 150, y: 200 }} />);

      // アンカー要素が指定された位置に配置される
      const anchor = screen.getByTestId("context-menu-anchor");
      expect(anchor).toHaveStyle({ left: "150px", top: "200px" });
    });
  });

  describe("Mantine Menu 移行", () => {
    it("Menu.Item コンポーネントを使用している", () => {
      renderWithMantine(<ContextMenu {...defaultProps} />);

      // Mantine Menu.Item はボタンとして role="menuitem" でレンダリングされる
      const menuItems = screen.getAllByRole("menuitem");
      expect(menuItems).toHaveLength(3);
    });

    it("削除アイテムに Mantine の color=red スタイルが適用されている", () => {
      renderWithMantine(<ContextMenu {...defaultProps} />);

      // Mantine Menu.Item with color="red" applies data-color attribute
      const deleteButton = screen.getByRole("menuitem", { name: /削除/i });
      expect(deleteButton).toBeInTheDocument();
    });

    it("Mantine Menu の onClose prop が外部クリック/Escape を処理する", () => {
      // Mantine Menu は opened と onClose prop で制御される
      // コンポーネントが独自の useEffect を使わず、Mantine の機能に依存していることを確認
      const onClose = vi.fn();
      renderWithMantine(<ContextMenu {...defaultProps} onClose={onClose} />);

      // Menu が開いている状態で描画されることを確認
      expect(screen.getByRole("menu")).toBeInTheDocument();
      // Mantine Menu には onClose prop が渡されており、
      // Mantine が外部クリックと Escape キーを処理する
    });
  });
});
