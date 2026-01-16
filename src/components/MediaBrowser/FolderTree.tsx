import { useCallback } from "react";
import { Tree, Loader, type RenderTreeNodePayload } from "@mantine/core";
import { Folder, ChevronRight, ChevronDown, Home } from "lucide-react";
import { useFolderTree } from "../../hooks/ui/useFolderTree";
import "./FolderTree.css";

export interface FolderTreeProps {
  /** Identity ID（認証ユーザーのID） */
  identityId: string;
  /** ルートパス（ツリーの起点） */
  rootPath: string;
  /** 無効化するパス（循環移動防止・移動元除外） */
  disabledPaths: string[];
  /** 現在のパス（移動元、無効化対象） */
  currentPath: string;
  /** フォルダ選択時コールバック */
  onSelect: (path: string) => void;
}

/**
 * Mantine Tree を使用したフォルダ階層表示コンポーネント
 */
export function FolderTree({
  identityId,
  rootPath,
  disabledPaths,
  currentPath,
  onSelect,
}: FolderTreeProps) {
  const { treeData, selectedPath, loadingPaths, tree, selectNode, toggleExpanded, isDisabled } =
    useFolderTree({
      identityId,
      rootPath,
      disabledPaths,
      currentPath,
    });

  // ノードクリック時の処理（展開と選択を両方行う）
  const handleNodeClick = useCallback(
    (value: string, isLoading: boolean) => {
      // 展開は常に許可（無効ノードでも展開可能）
      if (!isLoading) {
        toggleExpanded(value);
      }
      // 選択は無効でない場合のみ
      if (!isDisabled(value)) {
        selectNode(value);
        onSelect(value);
      }
    },
    [isDisabled, selectNode, onSelect, toggleExpanded],
  );

  // カスタムノードレンダリング
  const renderNode = useCallback(
    ({ node, expanded, elementProps }: RenderTreeNodePayload) => {
      const disabled = isDisabled(node.value);
      const isSelected = selectedPath === node.value;
      const isRoot = node.value === rootPath;
      const isLoading = loadingPaths.has(node.value);

      return (
        <div
          {...elementProps}
          className={`folder-tree-node ${disabled ? "disabled" : ""} ${isSelected ? "selected" : ""}`}
          data-disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            handleNodeClick(node.value, isLoading);
          }}
        >
          {/* 展開/折りたたみアイコン（常に表示、ローディング中はスピナー） */}
          <span className="expand-icon">
            {isLoading ? (
              <Loader size={14} />
            ) : expanded ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </span>

          {/* フォルダアイコン */}
          {isRoot ? (
            <Home size={16} className="folder-icon lucide-folder" />
          ) : (
            <Folder size={16} className="folder-icon lucide-folder" />
          )}

          {/* ラベル */}
          <span className="folder-label">{node.label}</span>
        </div>
      );
    },
    [isDisabled, selectedPath, rootPath, loadingPaths, handleNodeClick],
  );

  return (
    <div className="folder-tree">
      <Tree
        data={treeData}
        tree={tree}
        renderNode={renderNode}
        expandOnClick={false}
        selectOnClick={false}
        levelOffset={24}
      />
    </div>
  );
}
