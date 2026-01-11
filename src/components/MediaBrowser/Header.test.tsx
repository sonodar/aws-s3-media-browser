import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { Header } from "./Header";

const MantineWrapper = ({ children }: { children: ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

describe("Header", () => {
  it("should render home title when at root", () => {
    render(<Header currentPath="" onBack={vi.fn()} onSignOut={vi.fn()} />, {
      wrapper: MantineWrapper,
    });

    expect(screen.getByRole("heading", { name: "ホーム" })).toBeInTheDocument();
  });

  it("should render folder name as title when in a folder", () => {
    render(<Header currentPath="folder1" onBack={vi.fn()} onSignOut={vi.fn()} />, {
      wrapper: MantineWrapper,
    });

    expect(screen.getByRole("heading", { name: "folder1" })).toBeInTheDocument();
  });

  it("should show back button when currentPath is not empty", () => {
    render(<Header currentPath="folder1" onBack={vi.fn()} onSignOut={vi.fn()} />, {
      wrapper: MantineWrapper,
    });

    expect(screen.getByRole("button", { name: /戻る/ })).toBeInTheDocument();
  });

  it("should hide back button when currentPath is empty", () => {
    render(<Header currentPath="" onBack={vi.fn()} onSignOut={vi.fn()} />, {
      wrapper: MantineWrapper,
    });

    expect(screen.queryByRole("button", { name: /戻る/ })).not.toBeInTheDocument();
  });

  it("should call onBack when back button is clicked", () => {
    const onBack = vi.fn();
    render(<Header currentPath="folder1" onBack={onBack} onSignOut={vi.fn()} />, {
      wrapper: MantineWrapper,
    });

    fireEvent.click(screen.getByRole("button", { name: /戻る/ }));

    expect(onBack).toHaveBeenCalled();
  });

  it("should show sign out in dropdown menu", async () => {
    render(<Header currentPath="" onBack={vi.fn()} onSignOut={vi.fn()} />, {
      wrapper: MantineWrapper,
    });

    // メニューを開く
    fireEvent.click(screen.getByRole("button", { name: "メニューを開く" }));

    await waitFor(() => {
      expect(
        screen.getByRole("menuitem", { name: /サインアウト/, hidden: true }),
      ).toBeInTheDocument();
    });
  });

  it("should call onSignOut when sign out menu item is clicked", async () => {
    const onSignOut = vi.fn();
    render(<Header currentPath="" onBack={vi.fn()} onSignOut={onSignOut} />, {
      wrapper: MantineWrapper,
    });

    // メニューを開く
    fireEvent.click(screen.getByRole("button", { name: "メニューを開く" }));

    await waitFor(() => {
      expect(
        screen.getByRole("menuitem", { name: /サインアウト/, hidden: true }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("menuitem", { name: /サインアウト/, hidden: true }));

    expect(onSignOut).toHaveBeenCalled();
  });

  it("should display current folder name in breadcrumb", () => {
    render(<Header currentPath="folder1/folder2" onBack={vi.fn()} onSignOut={vi.fn()} />, {
      wrapper: MantineWrapper,
    });

    expect(screen.getByText("folder2")).toBeInTheDocument();
  });

  describe("選択モード", () => {
    it("通常モード時に選択モードボタンが表示される", () => {
      render(
        <Header
          currentPath=""
          onBack={vi.fn()}
          onSignOut={vi.fn()}
          isSelectionMode={false}
          onEnterSelectionMode={vi.fn()}
        />,
        { wrapper: MantineWrapper },
      );

      expect(screen.getByRole("button", { name: /選択/ })).toBeInTheDocument();
    });

    it("選択モードボタンクリックで onEnterSelectionMode が呼ばれる", () => {
      const onEnterSelectionMode = vi.fn();
      render(
        <Header
          currentPath=""
          onBack={vi.fn()}
          onSignOut={vi.fn()}
          isSelectionMode={false}
          onEnterSelectionMode={onEnterSelectionMode}
        />,
        { wrapper: MantineWrapper },
      );

      fireEvent.click(screen.getByRole("button", { name: /選択/ }));
      expect(onEnterSelectionMode).toHaveBeenCalled();
    });

    it("選択モード時はキャンセルボタンが表示される", () => {
      render(
        <Header
          currentPath=""
          onBack={vi.fn()}
          onSignOut={vi.fn()}
          isSelectionMode={true}
          selectedCount={0}
          onExitSelectionMode={vi.fn()}
        />,
        { wrapper: MantineWrapper },
      );

      expect(screen.getByRole("button", { name: /キャンセル/ })).toBeInTheDocument();
    });

    it("キャンセルボタンクリックで onExitSelectionMode が呼ばれる", () => {
      const onExitSelectionMode = vi.fn();
      render(
        <Header
          currentPath=""
          onBack={vi.fn()}
          onSignOut={vi.fn()}
          isSelectionMode={true}
          selectedCount={0}
          onExitSelectionMode={onExitSelectionMode}
        />,
        { wrapper: MantineWrapper },
      );

      fireEvent.click(screen.getByRole("button", { name: /キャンセル/ }));
      expect(onExitSelectionMode).toHaveBeenCalled();
    });

    it("選択モード時に選択件数が表示される", () => {
      render(
        <Header
          currentPath=""
          onBack={vi.fn()}
          onSignOut={vi.fn()}
          isSelectionMode={true}
          selectedCount={5}
          onExitSelectionMode={vi.fn()}
        />,
        { wrapper: MantineWrapper },
      );

      expect(screen.getByText("5件選択中")).toBeInTheDocument();
    });

    it("選択モード時に全選択ボタンが表示される", () => {
      render(
        <Header
          currentPath=""
          onBack={vi.fn()}
          onSignOut={vi.fn()}
          isSelectionMode={true}
          selectedCount={0}
          isAllSelected={false}
          onToggleSelectAll={vi.fn()}
          onExitSelectionMode={vi.fn()}
        />,
        { wrapper: MantineWrapper },
      );

      expect(screen.getByRole("button", { name: /全選択/ })).toBeInTheDocument();
    });

    it("全選択状態では全解除ボタンが表示される", () => {
      render(
        <Header
          currentPath=""
          onBack={vi.fn()}
          onSignOut={vi.fn()}
          isSelectionMode={true}
          selectedCount={3}
          isAllSelected={true}
          onToggleSelectAll={vi.fn()}
          onExitSelectionMode={vi.fn()}
        />,
        { wrapper: MantineWrapper },
      );

      expect(screen.getByRole("button", { name: /全解除/ })).toBeInTheDocument();
    });

    it("全選択ボタンクリックで onToggleSelectAll が呼ばれる", () => {
      const onToggleSelectAll = vi.fn();
      render(
        <Header
          currentPath=""
          onBack={vi.fn()}
          onSignOut={vi.fn()}
          isSelectionMode={true}
          selectedCount={0}
          isAllSelected={false}
          onToggleSelectAll={onToggleSelectAll}
          onExitSelectionMode={vi.fn()}
        />,
        { wrapper: MantineWrapper },
      );

      fireEvent.click(screen.getByRole("button", { name: /全選択/ }));
      expect(onToggleSelectAll).toHaveBeenCalled();
    });

    it("選択モード時に削除ボタンが表示される", () => {
      render(
        <Header
          currentPath=""
          onBack={vi.fn()}
          onSignOut={vi.fn()}
          isSelectionMode={true}
          selectedCount={1}
          onExitSelectionMode={vi.fn()}
          onDeleteSelected={vi.fn()}
        />,
        { wrapper: MantineWrapper },
      );

      expect(screen.getByRole("button", { name: /削除/ })).toBeInTheDocument();
    });

    it("選択件数が0の場合は削除ボタンが無効", () => {
      render(
        <Header
          currentPath=""
          onBack={vi.fn()}
          onSignOut={vi.fn()}
          isSelectionMode={true}
          selectedCount={0}
          onExitSelectionMode={vi.fn()}
          onDeleteSelected={vi.fn()}
        />,
        { wrapper: MantineWrapper },
      );

      const deleteButton = screen.getByRole("button", { name: /削除/ });
      expect(deleteButton).toBeDisabled();
    });

    it("選択件数が1以上の場合は削除ボタンが有効", () => {
      render(
        <Header
          currentPath=""
          onBack={vi.fn()}
          onSignOut={vi.fn()}
          isSelectionMode={true}
          selectedCount={3}
          onExitSelectionMode={vi.fn()}
          onDeleteSelected={vi.fn()}
        />,
        { wrapper: MantineWrapper },
      );

      const deleteButton = screen.getByRole("button", { name: /削除/ });
      expect(deleteButton).not.toBeDisabled();
    });

    it("削除ボタンクリックで onDeleteSelected が呼ばれる", () => {
      const onDeleteSelected = vi.fn();
      render(
        <Header
          currentPath=""
          onBack={vi.fn()}
          onSignOut={vi.fn()}
          isSelectionMode={true}
          selectedCount={1}
          onExitSelectionMode={vi.fn()}
          onDeleteSelected={onDeleteSelected}
        />,
        { wrapper: MantineWrapper },
      );

      fireEvent.click(screen.getByRole("button", { name: /削除/ }));
      expect(onDeleteSelected).toHaveBeenCalled();
    });

    it("選択モード時はドロップダウンメニューが非表示", () => {
      render(
        <Header
          currentPath=""
          onBack={vi.fn()}
          onSignOut={vi.fn()}
          isSelectionMode={true}
          selectedCount={0}
          onExitSelectionMode={vi.fn()}
        />,
        { wrapper: MantineWrapper },
      );

      expect(screen.queryByRole("button", { name: "メニューを開く" })).not.toBeInTheDocument();
    });

    it("選択件数が aria-live 属性を持つ要素に表示される", () => {
      render(
        <Header
          currentPath=""
          onBack={vi.fn()}
          onSignOut={vi.fn()}
          isSelectionMode={true}
          selectedCount={5}
          onExitSelectionMode={vi.fn()}
        />,
        { wrapper: MantineWrapper },
      );

      const liveRegion = screen.getByText("5件選択中");
      expect(liveRegion).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("ドロップダウンメニュー", () => {
    const defaultProps = {
      currentPath: "",
      onBack: vi.fn(),
      onSignOut: vi.fn(),
      onOpenSettings: vi.fn(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("通常モード時にメニューボタンが表示される", () => {
      render(<Header {...defaultProps} />, { wrapper: MantineWrapper });

      expect(screen.getByRole("button", { name: "メニューを開く" })).toBeInTheDocument();
    });

    it("メニューをクリックすると設定・サインアウトが表示される", async () => {
      render(<Header {...defaultProps} />, { wrapper: MantineWrapper });

      fireEvent.click(screen.getByRole("button", { name: "メニューを開く" }));

      await waitFor(() => {
        expect(screen.getByRole("menuitem", { name: /設定/, hidden: true })).toBeInTheDocument();
        expect(
          screen.getByRole("menuitem", { name: /サインアウト/, hidden: true }),
        ).toBeInTheDocument();
      });
    });

    it("設定メニューをクリックすると onOpenSettings が呼ばれる", async () => {
      const onOpenSettings = vi.fn();
      render(<Header {...defaultProps} onOpenSettings={onOpenSettings} />, {
        wrapper: MantineWrapper,
      });

      fireEvent.click(screen.getByRole("button", { name: "メニューを開く" }));

      await waitFor(() => {
        expect(screen.getByRole("menuitem", { name: /設定/, hidden: true })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("menuitem", { name: /設定/, hidden: true }));

      expect(onOpenSettings).toHaveBeenCalledTimes(1);
    });

    it("サインアウトメニューをクリックすると onSignOut が呼ばれる", async () => {
      const onSignOut = vi.fn();
      render(<Header {...defaultProps} onSignOut={onSignOut} />, { wrapper: MantineWrapper });

      fireEvent.click(screen.getByRole("button", { name: "メニューを開く" }));

      await waitFor(() => {
        expect(
          screen.getByRole("menuitem", { name: /サインアウト/, hidden: true }),
        ).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("menuitem", { name: /サインアウト/, hidden: true }));

      expect(onSignOut).toHaveBeenCalledTimes(1);
    });

    it("メニュートリガーに aria-haspopup 属性がある", () => {
      render(<Header {...defaultProps} />, { wrapper: MantineWrapper });

      expect(screen.getByRole("button", { name: "メニューを開く" })).toHaveAttribute(
        "aria-haspopup",
        "menu",
      );
    });

    it("選択モード時にはメニューボタンが表示されない", () => {
      render(
        <Header
          {...defaultProps}
          isSelectionMode={true}
          selectedCount={0}
          onExitSelectionMode={vi.fn()}
        />,
        { wrapper: MantineWrapper },
      );

      expect(screen.queryByRole("button", { name: "メニューを開く" })).not.toBeInTheDocument();
    });
  });

  describe("アイコンボタン", () => {
    it("戻るボタンにアイコンが含まれる", () => {
      render(<Header currentPath="folder1" onBack={vi.fn()} onSignOut={vi.fn()} />, {
        wrapper: MantineWrapper,
      });

      const backButton = screen.getByRole("button", { name: /戻る/ });
      // アイコンは aria-hidden なので SVG が存在することを確認
      expect(backButton.querySelector("svg")).toBeInTheDocument();
    });

    it("選択モード時のキャンセルボタンにアイコンが含まれる", () => {
      render(
        <Header
          currentPath=""
          onBack={vi.fn()}
          onSignOut={vi.fn()}
          isSelectionMode={true}
          selectedCount={0}
          onExitSelectionMode={vi.fn()}
        />,
        { wrapper: MantineWrapper },
      );

      const cancelButton = screen.getByRole("button", { name: /キャンセル/ });
      expect(cancelButton.querySelector("svg")).toBeInTheDocument();
    });

    it("選択モード時の削除ボタンにアイコンが含まれる", () => {
      render(
        <Header
          currentPath=""
          onBack={vi.fn()}
          onSignOut={vi.fn()}
          isSelectionMode={true}
          selectedCount={1}
          onExitSelectionMode={vi.fn()}
          onDeleteSelected={vi.fn()}
        />,
        { wrapper: MantineWrapper },
      );

      const deleteButton = screen.getByRole("button", { name: /削除/ });
      expect(deleteButton.querySelector("svg")).toBeInTheDocument();
    });

    it("選択モードボタンにアイコンが含まれる", () => {
      render(
        <Header
          currentPath=""
          onBack={vi.fn()}
          onSignOut={vi.fn()}
          isSelectionMode={false}
          onEnterSelectionMode={vi.fn()}
        />,
        { wrapper: MantineWrapper },
      );

      const selectionButton = screen.getByRole("button", { name: /選択/ });
      expect(selectionButton.querySelector("svg")).toBeInTheDocument();
    });

    it("全選択ボタンにアイコンが含まれる", () => {
      render(
        <Header
          currentPath=""
          onBack={vi.fn()}
          onSignOut={vi.fn()}
          isSelectionMode={true}
          selectedCount={0}
          isAllSelected={false}
          onToggleSelectAll={vi.fn()}
          onExitSelectionMode={vi.fn()}
        />,
        { wrapper: MantineWrapper },
      );

      const selectAllButton = screen.getByRole("button", { name: /全選択/ });
      expect(selectAllButton.querySelector("svg")).toBeInTheDocument();
    });
  });

  describe("3状態チェックボックス", () => {
    it("選択件数が0の場合は空のチェックボックスアイコンが表示される", () => {
      render(
        <Header
          currentPath=""
          onBack={vi.fn()}
          onSignOut={vi.fn()}
          isSelectionMode={true}
          selectedCount={0}
          totalCount={5}
          isAllSelected={false}
          onToggleSelectAll={vi.fn()}
          onExitSelectionMode={vi.fn()}
        />,
        { wrapper: MantineWrapper },
      );

      const selectAllButton = screen.getByRole("button", { name: /全選択/ });
      expect(selectAllButton).toBeInTheDocument();
      expect(selectAllButton.querySelector("svg")).toBeInTheDocument();
    });

    it("部分選択時（一部のアイテムのみ選択）はマイナスアイコンが表示される", () => {
      render(
        <Header
          currentPath=""
          onBack={vi.fn()}
          onSignOut={vi.fn()}
          isSelectionMode={true}
          selectedCount={2}
          totalCount={5}
          isAllSelected={false}
          onToggleSelectAll={vi.fn()}
          onExitSelectionMode={vi.fn()}
        />,
        { wrapper: MantineWrapper },
      );

      // 部分選択時は「全選択」ラベルが表示される
      const selectAllButton = screen.getByRole("button", { name: /全選択/ });
      expect(selectAllButton).toBeInTheDocument();
      expect(selectAllButton.querySelector("svg")).toBeInTheDocument();
    });

    it("全選択時はチェック済みアイコンと「全解除」ラベルが表示される", () => {
      render(
        <Header
          currentPath=""
          onBack={vi.fn()}
          onSignOut={vi.fn()}
          isSelectionMode={true}
          selectedCount={5}
          totalCount={5}
          isAllSelected={true}
          onToggleSelectAll={vi.fn()}
          onExitSelectionMode={vi.fn()}
        />,
        { wrapper: MantineWrapper },
      );

      const selectAllButton = screen.getByRole("button", { name: /全解除/ });
      expect(selectAllButton).toBeInTheDocument();
      expect(selectAllButton.querySelector("svg")).toBeInTheDocument();
    });

    it("isAllSelected が true の場合は selectedCount と totalCount に関係なく全選択状態", () => {
      render(
        <Header
          currentPath=""
          onBack={vi.fn()}
          onSignOut={vi.fn()}
          isSelectionMode={true}
          selectedCount={3}
          totalCount={5}
          isAllSelected={true}
          onToggleSelectAll={vi.fn()}
          onExitSelectionMode={vi.fn()}
        />,
        { wrapper: MantineWrapper },
      );

      expect(screen.getByRole("button", { name: /全解除/ })).toBeInTheDocument();
    });

    it("totalCount が 0 の場合でも selectedCount が 0 なら未選択状態", () => {
      render(
        <Header
          currentPath=""
          onBack={vi.fn()}
          onSignOut={vi.fn()}
          isSelectionMode={true}
          selectedCount={0}
          totalCount={0}
          isAllSelected={false}
          onToggleSelectAll={vi.fn()}
          onExitSelectionMode={vi.fn()}
        />,
        { wrapper: MantineWrapper },
      );

      expect(screen.getByRole("button", { name: /全選択/ })).toBeInTheDocument();
    });
  });
});
