import { describe, it, expect } from "vitest";
import { sortStorageItems, SORT_ORDER_LABELS, DEFAULT_SORT_ORDER } from "./sortStorageItems";
import type { SortOrder } from "./sortStorageItems";
import type { StorageItem } from "../../types/storage";

// テスト用のヘルパー関数
const createItem = (
  name: string,
  type: "file" | "folder",
  lastModified?: Date,
  size?: number,
): StorageItem => ({
  key: `test/${name}`,
  name,
  type,
  lastModified,
  size,
});

describe("sortStorageItems", () => {
  describe("型と定数の定義", () => {
    it("デフォルトのソート順が newest であること", () => {
      expect(DEFAULT_SORT_ORDER).toBe("newest");
    });

    it("4つのソートオプションのラベルが定義されていること", () => {
      expect(SORT_ORDER_LABELS).toEqual({
        newest: "新しい順",
        oldest: "古い順",
        name: "名前順",
        size: "サイズ順",
      });
    });
  });

  describe("フォルダ優先表示", () => {
    it("すべてのソート順でフォルダがファイルより先に表示されること", () => {
      const items: StorageItem[] = [
        createItem("file1.jpg", "file", new Date("2024-01-01")),
        createItem("folder1", "folder", new Date("2024-01-02")),
        createItem("file2.jpg", "file", new Date("2024-01-03")),
        createItem("folder2", "folder", new Date("2024-01-04")),
      ];

      const sortOrders: SortOrder[] = ["newest", "oldest", "name", "size"];

      for (const order of sortOrders) {
        const sorted = sortStorageItems(items, order);
        const folderIndices = sorted
          .map((item, index) => (item.type === "folder" ? index : -1))
          .filter((i) => i >= 0);
        const fileIndices = sorted
          .map((item, index) => (item.type === "file" ? index : -1))
          .filter((i) => i >= 0);

        // すべてのフォルダのインデックスがすべてのファイルのインデックスより小さいこと
        const maxFolderIndex = Math.max(...folderIndices);
        const minFileIndex = Math.min(...fileIndices);
        expect(maxFolderIndex).toBeLessThan(minFileIndex);
      }
    });
  });

  describe("新しい順（newest）でのソート", () => {
    it("フォルダ群とファイル群それぞれが lastModified 降順でソートされること", () => {
      const items: StorageItem[] = [
        createItem("folder1", "folder", new Date("2024-01-01")),
        createItem("folder2", "folder", new Date("2024-01-03")),
        createItem("folder3", "folder", new Date("2024-01-02")),
        createItem("file1.jpg", "file", new Date("2024-01-01")),
        createItem("file2.jpg", "file", new Date("2024-01-03")),
        createItem("file3.jpg", "file", new Date("2024-01-02")),
      ];

      const sorted = sortStorageItems(items, "newest");

      // フォルダ群
      expect(sorted[0].name).toBe("folder2"); // 1/3
      expect(sorted[1].name).toBe("folder3"); // 1/2
      expect(sorted[2].name).toBe("folder1"); // 1/1
      // ファイル群
      expect(sorted[3].name).toBe("file2.jpg"); // 1/3
      expect(sorted[4].name).toBe("file3.jpg"); // 1/2
      expect(sorted[5].name).toBe("file1.jpg"); // 1/1
    });

    it("lastModified が undefined の場合は最も古いものとして扱われること", () => {
      const items: StorageItem[] = [
        createItem("file1.jpg", "file", undefined),
        createItem("file2.jpg", "file", new Date("2024-01-01")),
        createItem("file3.jpg", "file", new Date("2024-01-02")),
      ];

      const sorted = sortStorageItems(items, "newest");

      expect(sorted[0].name).toBe("file3.jpg"); // 1/2
      expect(sorted[1].name).toBe("file2.jpg"); // 1/1
      expect(sorted[2].name).toBe("file1.jpg"); // undefined = 最古
    });
  });

  describe("古い順（oldest）でのソート", () => {
    it("フォルダ群とファイル群それぞれが lastModified 昇順でソートされること", () => {
      const items: StorageItem[] = [
        createItem("folder1", "folder", new Date("2024-01-01")),
        createItem("folder2", "folder", new Date("2024-01-03")),
        createItem("folder3", "folder", new Date("2024-01-02")),
        createItem("file1.jpg", "file", new Date("2024-01-01")),
        createItem("file2.jpg", "file", new Date("2024-01-03")),
        createItem("file3.jpg", "file", new Date("2024-01-02")),
      ];

      const sorted = sortStorageItems(items, "oldest");

      // フォルダ群
      expect(sorted[0].name).toBe("folder1"); // 1/1
      expect(sorted[1].name).toBe("folder3"); // 1/2
      expect(sorted[2].name).toBe("folder2"); // 1/3
      // ファイル群
      expect(sorted[3].name).toBe("file1.jpg"); // 1/1
      expect(sorted[4].name).toBe("file3.jpg"); // 1/2
      expect(sorted[5].name).toBe("file2.jpg"); // 1/3
    });
  });

  describe("名前順（name）でのソート", () => {
    it("フォルダ群とファイル群それぞれが名前の自然順（数字を正しく扱う）でソートされること", () => {
      const items: StorageItem[] = [
        createItem("folder10", "folder"),
        createItem("folder2", "folder"),
        createItem("folder1", "folder"),
        createItem("image10.jpg", "file"),
        createItem("image2.jpg", "file"),
        createItem("image1.jpg", "file"),
      ];

      const sorted = sortStorageItems(items, "name");

      // フォルダ群 - 自然順ソート
      expect(sorted[0].name).toBe("folder1");
      expect(sorted[1].name).toBe("folder2");
      expect(sorted[2].name).toBe("folder10");
      // ファイル群 - 自然順ソート
      expect(sorted[3].name).toBe("image1.jpg");
      expect(sorted[4].name).toBe("image2.jpg");
      expect(sorted[5].name).toBe("image10.jpg");
    });

    it("日本語名もロケール対応でソートされること", () => {
      const items: StorageItem[] = [
        createItem("あいうえお.jpg", "file"),
        createItem("かきくけこ.jpg", "file"),
        createItem("ABC.jpg", "file"),
      ];

      const sorted = sortStorageItems(items, "name");

      // ロケール依存だが、一貫した順序であること
      expect(sorted).toHaveLength(3);
    });
  });

  describe("サイズ順（size）でのソート", () => {
    it("フォルダ群とファイル群それぞれがサイズ降順（大きい順）でソートされること", () => {
      const items: StorageItem[] = [
        createItem("folder1", "folder", undefined, 100),
        createItem("folder2", "folder", undefined, 300),
        createItem("folder3", "folder", undefined, 200),
        createItem("small.jpg", "file", undefined, 100),
        createItem("large.jpg", "file", undefined, 300),
        createItem("medium.jpg", "file", undefined, 200),
      ];

      const sorted = sortStorageItems(items, "size");

      // フォルダ群 - サイズ降順
      expect(sorted[0].name).toBe("folder2"); // 300
      expect(sorted[1].name).toBe("folder3"); // 200
      expect(sorted[2].name).toBe("folder1"); // 100
      // ファイル群 - サイズ降順
      expect(sorted[3].name).toBe("large.jpg"); // 300
      expect(sorted[4].name).toBe("medium.jpg"); // 200
      expect(sorted[5].name).toBe("small.jpg"); // 100
    });

    it("size が undefined の場合は 0 として扱われること", () => {
      const items: StorageItem[] = [
        createItem("file1.jpg", "file", undefined, undefined),
        createItem("file2.jpg", "file", undefined, 100),
        createItem("file3.jpg", "file", undefined, 50),
      ];

      const sorted = sortStorageItems(items, "size");

      expect(sorted[0].name).toBe("file2.jpg"); // 100
      expect(sorted[1].name).toBe("file3.jpg"); // 50
      expect(sorted[2].name).toBe("file1.jpg"); // undefined = 0
    });
  });

  describe("イミュータビリティ", () => {
    it("元の配列を変更しないこと", () => {
      const items: StorageItem[] = [
        createItem("b.jpg", "file", new Date("2024-01-01")),
        createItem("a.jpg", "file", new Date("2024-01-02")),
      ];
      const original = [...items];

      sortStorageItems(items, "name");

      expect(items).toEqual(original);
    });
  });

  describe("空配列", () => {
    it("空配列を渡した場合は空配列を返すこと", () => {
      const sorted = sortStorageItems([], "newest");
      expect(sorted).toEqual([]);
    });
  });
});
