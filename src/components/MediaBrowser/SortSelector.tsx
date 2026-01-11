import { NativeSelect } from "@mantine/core";
import type { SortOrder } from "../../hooks/sortStorageItems";
import { SORT_ORDER_LABELS } from "../../hooks/sortStorageItems";

interface SortSelectorProps {
  currentOrder: SortOrder;
  onChange: (order: SortOrder) => void;
}

const SORT_OPTIONS: SortOrder[] = ["newest", "oldest", "name", "size"];

export function SortSelector({ currentOrder, onChange }: SortSelectorProps) {
  return (
    <NativeSelect
      value={currentOrder}
      onChange={(e) => onChange(e.currentTarget.value as SortOrder)}
      aria-label="並び順"
      data={SORT_OPTIONS.map((order) => ({
        value: order,
        label: SORT_ORDER_LABELS[order],
      }))}
    />
  );
}
