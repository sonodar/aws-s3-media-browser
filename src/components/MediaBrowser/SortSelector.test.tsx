import type { ReactNode } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { SortSelector } from "./SortSelector";
import type { SortOrder } from "../../hooks/sortStorageItems";

const MantineWrapper = ({ children }: { children: ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

describe("SortSelector", () => {
  const defaultProps = {
    currentOrder: "newest" as SortOrder,
    onChange: vi.fn(),
  };

  describe("レンダリング", () => {
    it("4つのソートオプションが表示されること", () => {
      render(<SortSelector {...defaultProps} />, { wrapper: MantineWrapper });

      const select = screen.getByRole("combobox");
      expect(select).toBeInTheDocument();

      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(4);
    });

    it("各オプションに正しいラベルが表示されること", () => {
      render(<SortSelector {...defaultProps} />, { wrapper: MantineWrapper });

      expect(screen.getByRole("option", { name: "新しい順" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "古い順" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "名前順" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "サイズ順" })).toBeInTheDocument();
    });

    it("現在のソート順が選択されていること", () => {
      render(<SortSelector {...defaultProps} currentOrder="name" />, { wrapper: MantineWrapper });

      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe("name");
    });
  });

  describe("インタラクション", () => {
    it("オプションを選択すると onChange が呼ばれること", () => {
      const onChange = vi.fn();
      render(<SortSelector {...defaultProps} onChange={onChange} />, { wrapper: MantineWrapper });

      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: "oldest" } });

      expect(onChange).toHaveBeenCalledWith("oldest");
    });

    it.each(["newest", "oldest", "name", "size"] as SortOrder[])(
      "ソート順 %s を選択できること",
      (order) => {
        const onChange = vi.fn();
        render(<SortSelector {...defaultProps} onChange={onChange} />, { wrapper: MantineWrapper });

        const select = screen.getByRole("combobox");
        fireEvent.change(select, { target: { value: order } });

        expect(onChange).toHaveBeenCalledWith(order);
      },
    );
  });

  describe("アクセシビリティ", () => {
    it("適切な aria-label が設定されていること", () => {
      render(<SortSelector {...defaultProps} />, { wrapper: MantineWrapper });

      const select = screen.getByRole("combobox");
      expect(select).toHaveAttribute("aria-label", "並び順");
    });
  });
});
