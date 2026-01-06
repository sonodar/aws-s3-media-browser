import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Header } from "./Header";

describe("Header", () => {
  it("should render app title", () => {
    render(<Header currentPath="" onBack={vi.fn()} onSignOut={vi.fn()} />);

    expect(screen.getByText("S3 Media Browser")).toBeInTheDocument();
  });

  it("should show back button when currentPath is not empty", () => {
    render(<Header currentPath="folder1" onBack={vi.fn()} onSignOut={vi.fn()} />);

    expect(screen.getByRole("button", { name: /戻る/ })).toBeInTheDocument();
  });

  it("should hide back button when currentPath is empty", () => {
    render(<Header currentPath="" onBack={vi.fn()} onSignOut={vi.fn()} />);

    expect(screen.queryByRole("button", { name: /戻る/ })).not.toBeInTheDocument();
  });

  it("should call onBack when back button is clicked", () => {
    const onBack = vi.fn();
    render(<Header currentPath="folder1" onBack={onBack} onSignOut={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /戻る/ }));

    expect(onBack).toHaveBeenCalled();
  });

  it("should show sign out button", () => {
    render(<Header currentPath="" onBack={vi.fn()} onSignOut={vi.fn()} />);

    expect(screen.getByRole("button", { name: /サインアウト/ })).toBeInTheDocument();
  });

  it("should call onSignOut when sign out button is clicked", () => {
    const onSignOut = vi.fn();
    render(<Header currentPath="" onBack={vi.fn()} onSignOut={onSignOut} />);

    fireEvent.click(screen.getByRole("button", { name: /サインアウト/ }));

    expect(onSignOut).toHaveBeenCalled();
  });

  it("should display current folder name in breadcrumb", () => {
    render(<Header currentPath="folder1/folder2" onBack={vi.fn()} onSignOut={vi.fn()} />);

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
      );

      fireEvent.click(screen.getByRole("button", { name: /削除/ }));
      expect(onDeleteSelected).toHaveBeenCalled();
    });

    it("選択モード時は通常のサインアウトボタンが非表示", () => {
      render(
        <Header
          currentPath=""
          onBack={vi.fn()}
          onSignOut={vi.fn()}
          isSelectionMode={true}
          selectedCount={0}
          onExitSelectionMode={vi.fn()}
        />,
      );

      expect(screen.queryByRole("button", { name: /サインアウト/ })).not.toBeInTheDocument();
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
      );

      const liveRegion = screen.getByText("5件選択中");
      expect(liveRegion).toHaveAttribute("aria-live", "polite");
    });
  });
});
