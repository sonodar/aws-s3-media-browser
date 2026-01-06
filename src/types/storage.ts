/**
 * S3 ストレージアイテムを表す型
 * 複数のフック・コンポーネントで共有される
 */
export interface StorageItem {
  key: string;
  name: string;
  type: "file" | "folder";
  size?: number;
  lastModified?: Date;
}
