import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DropdownMenu } from "./DropdownMenu";
import { Settings, LogOut } from "lucide-react";

describe("DropdownMenu", () => {
  const mockOnSettingsClick = vi.fn();
  const mockOnLogoutClick = vi.fn();

  const defaultItems = [
    { label: "設定", icon: Settings, onClick: mockOnSettingsClick },
    { label: "サインアウト", icon: LogOut, onClick: mockOnLogoutClick, danger: true },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render trigger button with aria-label", () => {
      render(<DropdownMenu items={defaultItems} triggerLabel="メニューを開く" />);
      expect(screen.getByRole("button", { name: "メニューを開く" })).toBeInTheDocument();
    });

    it("should have aria-haspopup attribute on trigger", () => {
      render(<DropdownMenu items={defaultItems} triggerLabel="メニューを開く" />);
      expect(screen.getByRole("button", { name: "メニューを開く" })).toHaveAttribute(
        "aria-haspopup",
        "menu",
      );
    });

    it("should have aria-expanded false when closed", () => {
      render(<DropdownMenu items={defaultItems} triggerLabel="メニューを開く" />);
      expect(screen.getByRole("button", { name: "メニューを開く" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    });

    it("should not render menu when closed", () => {
      render(<DropdownMenu items={defaultItems} triggerLabel="メニューを開く" />);
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  describe("opening menu", () => {
    it("should open menu when trigger is clicked", () => {
      render(<DropdownMenu items={defaultItems} triggerLabel="メニューを開く" />);

      fireEvent.click(screen.getByRole("button", { name: "メニューを開く" }));

      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("should set aria-expanded true when open", () => {
      render(<DropdownMenu items={defaultItems} triggerLabel="メニューを開く" />);

      fireEvent.click(screen.getByRole("button", { name: "メニューを開く" }));

      expect(screen.getByRole("button", { name: "メニューを開く" })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
    });

    it("should render menu items with role menuitem", () => {
      render(<DropdownMenu items={defaultItems} triggerLabel="メニューを開く" />);

      fireEvent.click(screen.getByRole("button", { name: "メニューを開く" }));

      const menuItems = screen.getAllByRole("menuitem");
      expect(menuItems).toHaveLength(2);
      expect(menuItems[0]).toHaveTextContent("設定");
      expect(menuItems[1]).toHaveTextContent("サインアウト");
    });
  });

  describe("closing menu", () => {
    it("should close menu when clicking trigger again", () => {
      render(<DropdownMenu items={defaultItems} triggerLabel="メニューを開く" />);

      const trigger = screen.getByRole("button", { name: "メニューを開く" });
      fireEvent.click(trigger);
      expect(screen.getByRole("menu")).toBeInTheDocument();

      fireEvent.click(trigger);
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("should close menu when pressing Escape", () => {
      render(<DropdownMenu items={defaultItems} triggerLabel="メニューを開く" />);

      fireEvent.click(screen.getByRole("button", { name: "メニューを開く" }));
      expect(screen.getByRole("menu")).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("should close menu when clicking outside", () => {
      render(
        <div>
          <div data-testid="outside">Outside</div>
          <DropdownMenu items={defaultItems} triggerLabel="メニューを開く" />
        </div>,
      );

      fireEvent.click(screen.getByRole("button", { name: "メニューを開く" }));
      expect(screen.getByRole("menu")).toBeInTheDocument();

      fireEvent.mouseDown(screen.getByTestId("outside"));
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  describe("menu item interactions", () => {
    it("should call onClick when menu item is clicked", () => {
      render(<DropdownMenu items={defaultItems} triggerLabel="メニューを開く" />);

      fireEvent.click(screen.getByRole("button", { name: "メニューを開く" }));
      fireEvent.click(screen.getByRole("menuitem", { name: /設定/ }));

      expect(mockOnSettingsClick).toHaveBeenCalledTimes(1);
    });

    it("should close menu after clicking menu item", () => {
      render(<DropdownMenu items={defaultItems} triggerLabel="メニューを開く" />);

      fireEvent.click(screen.getByRole("button", { name: "メニューを開く" }));
      fireEvent.click(screen.getByRole("menuitem", { name: /設定/ }));

      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("should render danger item with danger class", () => {
      render(<DropdownMenu items={defaultItems} triggerLabel="メニューを開く" />);

      fireEvent.click(screen.getByRole("button", { name: "メニューを開く" }));

      const dangerItem = screen.getByRole("menuitem", { name: /サインアウト/ });
      expect(dangerItem).toHaveClass("dropdown-menu-item--danger");
    });
  });

  describe("keyboard navigation", () => {
    it("should activate menu item on Enter key", () => {
      render(<DropdownMenu items={defaultItems} triggerLabel="メニューを開く" />);

      fireEvent.click(screen.getByRole("button", { name: "メニューを開く" }));
      const settingsItem = screen.getByRole("menuitem", { name: /設定/ });
      fireEvent.keyDown(settingsItem, { key: "Enter" });

      expect(mockOnSettingsClick).toHaveBeenCalledTimes(1);
    });
  });
});
