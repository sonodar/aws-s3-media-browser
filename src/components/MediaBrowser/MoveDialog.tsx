import { useState, useCallback, useMemo } from "react";
import { Modal, Stack, Group, Button, Text, List, Notification } from "@mantine/core";
import { CheckCircle } from "lucide-react";
import { FolderBrowser } from "./FolderBrowser";
import type { StorageItem } from "../../types/storage";
import type { MoveResult, MoveProgress } from "../../hooks/storage";
import { ErrorMessage } from "./ErrorMessage";

export interface MoveDialogProps {
  /** ダイアログ表示状態 */
  isOpen: boolean;
  /** 移動対象アイテム */
  items: StorageItem[];
  /** 現在のパス（移動元） */
  currentPath: string;
  /** ルートパス */
  rootPath: string;
  /** Identity ID（認証ユーザーのID） */
  identityId: string;
  /** ダイアログを閉じる */
  onClose: () => void;
  /** 移動実行 */
  onMove: (
    items: StorageItem[],
    destinationPath: string,
    onProgress?: (progress: MoveProgress) => void,
  ) => Promise<MoveResult>;
}

/**
 * ファイル/フォルダ移動ダイアログ
 * 表示中のフォルダが移動先となる
 *
 * Architecture Note:
 * - 状態リセットは `key` 属性で行う（禁止用途 useEffect の排除）
 * - 親コンポーネント（MediaBrowser）でダイアログを開くたびに新しい key を設定し、
 *   コンポーネントを再マウントすることで内部状態を初期化する
 */
export function MoveDialog({
  isOpen,
  items,
  currentPath,
  rootPath,
  identityId,
  onClose,
  onMove,
}: MoveDialogProps) {
  // 表示中のパス = 移動先（初期値は currentPath = 移動元フォルダ）
  const [browsePath, setBrowsePath] = useState(currentPath);
  const [isMoving, setIsMoving] = useState(false);
  const [progress, setProgress] = useState<MoveProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [failedItems, setFailedItems] = useState<string[]>([]);

  // 無効化するパス（循環移動防止）
  const disabledPaths = useMemo(() => {
    const paths: string[] = [];

    for (const item of items) {
      if (item.type === "folder") {
        // フォルダ自身は無効
        paths.push(item.key);
      }
    }

    return paths;
  }, [items]);

  // 循環移動のチェック
  const isCircularMove = useCallback(
    (destPath: string) => {
      for (const item of items) {
        if (item.type === "folder") {
          // 移動先が移動元フォルダ自身または配下の場合は循環
          if (destPath === item.key || destPath.startsWith(item.key)) {
            return true;
          }
        }
      }
      return false;
    },
    [items],
  );

  // 現在の表示パスが有効な移動先かチェック
  const isSameAsSource = browsePath === currentPath;
  const isCircular = isCircularMove(browsePath);
  const canMove = !isSameAsSource && !isCircular && !isMoving && !successMessage;

  // フォルダナビゲーション
  const handleNavigate = useCallback((path: string) => {
    setBrowsePath(path);
    setError(null);
  }, []);

  // 移動実行
  const handleMove = useCallback(async () => {
    if (!canMove) return;

    setIsMoving(true);
    setError(null);
    setFailedItems([]);
    setProgress(null);

    try {
      const result = await onMove(items, browsePath, (p) => {
        setProgress(p);
      });

      if (result.success) {
        setSuccessMessage(`${result.succeeded}件の移動が完了しました`);
        // 1.5秒後に閉じる
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(result.error || "移動に失敗しました");
        if (result.failedItems) {
          setFailedItems(result.failedItems);
        }
      }
    } catch (err: unknown) {
      console.error("Move operation failed:", err);
      setError("予期しないエラーが発生しました");
    } finally {
      setIsMoving(false);
      setProgress(null);
    }
  }, [canMove, items, browsePath, onMove, onClose]);

  // 表示パスから表示名を取得
  const getDisplayName = useCallback(
    (path: string) => {
      if (path === rootPath) {
        return "ホーム";
      }
      const pathWithoutTrailingSlash = path.endsWith("/") ? path.slice(0, -1) : path;
      const lastSlashIndex = pathWithoutTrailingSlash.lastIndexOf("/");
      if (lastSlashIndex === -1) {
        return pathWithoutTrailingSlash || "ホーム";
      }
      return pathWithoutTrailingSlash.slice(lastSlashIndex + 1);
    },
    [rootPath],
  );

  // エラーメッセージの決定
  const getErrorMessage = () => {
    if (error) return error;
    if (isSameAsSource) return "移動元と同じフォルダには移動できません";
    if (isCircular) return "移動元のフォルダ配下には移動できません";
    return null;
  };

  const errorMessage = getErrorMessage();

  if (!isOpen) return null;

  const itemCount = items.length;

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={`${itemCount}件のアイテムを移動`}
      size="lg"
      centered
      closeOnClickOutside={!isMoving}
      closeOnEscape={!isMoving}
      withCloseButton={!isMoving}
    >
      <Stack gap="md">
        {/* 現在の移動先 */}
        <Group gap="xs">
          <Text size="sm" fw={500}>
            移動先:
          </Text>
          <Text size="sm" data-testid="selected-path">
            {getDisplayName(browsePath)}
          </Text>
        </Group>

        {/* フォルダブラウザ */}
        <FolderBrowser
          identityId={identityId}
          currentPath={browsePath}
          rootPath={rootPath}
          disabledPaths={disabledPaths}
          onNavigate={handleNavigate}
        />

        {/* エラーメッセージ */}
        {errorMessage && !successMessage && (
          <ErrorMessage message={errorMessage}>
            {failedItems.length > 0 && (
              <List size="sm">
                {failedItems.map((item) => (
                  <List.Item key={item}>{item}</List.Item>
                ))}
              </List>
            )}
          </ErrorMessage>
        )}

        {/* 成功メッセージ */}
        {successMessage && (
          <Notification color="green" icon={<CheckCircle size={16} />} withCloseButton={false}>
            {successMessage}
          </Notification>
        )}

        {/* 進捗表示 */}
        {progress && (
          <Text size="sm" c="dimmed">
            {progress.current} / {progress.total} 件処理中...
          </Text>
        )}

        {/* アクションボタン */}
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onClose} disabled={isMoving}>
            キャンセル
          </Button>
          <Button onClick={handleMove} loading={isMoving} disabled={!canMove && !isMoving}>
            ここに移動
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
