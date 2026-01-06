import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FileActionMenu } from "./FileActionMenu";

describe("FileActionMenu", () => {
  const mockOnRename = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnMove = vi.fn();

  const defaultProps = {
    itemName: "test-file.jpg",
    onRename: mockOnRename,
    onDelete: mockOnDelete,
    onMove: mockOnMove,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render trigger button with item-specific aria-label", () => {
      render(<FileActionMenu {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: "test-file.jpg のアクション" }),
      ).toBeInTheDocument();
    });

    it("should render ellipsis icon in trigger", () => {
      render(<FileActionMenu {...defaultProps} />);

      const trigger = screen.getByRole("button", { name: "test-file.jpg のアクション" });
      expect(trigger.querySelector("svg")).toBeInTheDocument();
    });

    it("should not render menu when closed", () => {
      render(<FileActionMenu {...defaultProps} />);

      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  describe("menu items", () => {
    it("should show rename, move, and delete options when opened", () => {
      render(<FileActionMenu {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: "test-file.jpg のアクション" }));

      expect(screen.getByRole("menuitem", { name: /名前を変更/ })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: /移動/ })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: /削除/ })).toBeInTheDocument();
    });

    it("should call onMove when move is clicked", () => {
      render(<FileActionMenu {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: "test-file.jpg のアクション" }));
      fireEvent.click(screen.getByRole("menuitem", { name: /移動/ }));

      expect(mockOnMove).toHaveBeenCalledTimes(1);
    });

    it("should call onRename when rename is clicked", () => {
      render(<FileActionMenu {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: "test-file.jpg のアクション" }));
      fireEvent.click(screen.getByRole("menuitem", { name: /名前を変更/ }));

      expect(mockOnRename).toHaveBeenCalledTimes(1);
    });

    it("should call onDelete when delete is clicked", () => {
      render(<FileActionMenu {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: "test-file.jpg のアクション" }));
      fireEvent.click(screen.getByRole("menuitem", { name: /削除/ }));

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    it("should render delete option with danger styling", () => {
      render(<FileActionMenu {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: "test-file.jpg のアクション" }));

      const deleteItem = screen.getByRole("menuitem", { name: /削除/ });
      expect(deleteItem).toHaveClass("dropdown-menu-item--danger");
    });
  });

  describe("event propagation", () => {
    it("should stop propagation when menu container is clicked", () => {
      const parentClickHandler = vi.fn();
      render(
        <div onClick={parentClickHandler}>
          <FileActionMenu {...defaultProps} />
        </div>,
      );

      const container = screen
        .getByRole("button", { name: "test-file.jpg のアクション" })
        .closest(".file-action-menu");
      fireEvent.click(container!);

      expect(parentClickHandler).not.toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    it("should have aria-haspopup on trigger", () => {
      render(<FileActionMenu {...defaultProps} />);

      expect(screen.getByRole("button", { name: "test-file.jpg のアクション" })).toHaveAttribute(
        "aria-haspopup",
        "menu",
      );
    });

    it("should have proper ARIA roles in menu", () => {
      render(<FileActionMenu {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: "test-file.jpg のアクション" }));

      expect(screen.getByRole("menu")).toBeInTheDocument();
      expect(screen.getAllByRole("menuitem")).toHaveLength(3);
    });
  });
});
