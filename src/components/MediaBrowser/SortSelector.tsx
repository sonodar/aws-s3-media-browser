import type { SortOrder } from "../../hooks/sortStorageItems";
import { SORT_ORDER_LABELS } from "../../hooks/sortStorageItems";
import "./SortSelector.css";

interface SortSelectorProps {
  currentOrder: SortOrder;
  onChange: (order: SortOrder) => void;
}

const SORT_OPTIONS: SortOrder[] = ["newest", "oldest", "name", "size"];

export function SortSelector({ currentOrder, onChange }: SortSelectorProps) {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as SortOrder;
    onChange(value);
  };

  return (
    <div className="sort-selector">
      <select
        value={currentOrder}
        onChange={handleChange}
        aria-label="並び順"
        className="sort-selector-select"
      >
        {SORT_OPTIONS.map((order) => (
          <option key={order} value={order}>
            {SORT_ORDER_LABELS[order]}
          </option>
        ))}
      </select>
    </div>
  );
}
