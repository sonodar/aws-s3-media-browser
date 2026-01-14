import type { ReactNode } from "react";
import { Alert, Stack, Text } from "@mantine/core";
import { AlertCircle } from "lucide-react";

interface ErrorMessageProps {
  /** エラーメッセージ */
  message: string;
  /** 詳細情報（リスト表示など） */
  children?: ReactNode;
}

/**
 * エラーメッセージ表示コンポーネント
 *
 * ダイアログ内でバリデーションエラーや操作エラーを表示するための共通コンポーネント。
 * Alert (赤色) + AlertCircle アイコン + Stack + Text のパターンを使用。
 */
export function ErrorMessage({ message, children }: ErrorMessageProps) {
  return (
    <Alert color="red" icon={<AlertCircle size={16} />}>
      <Stack gap="xs">
        <Text size="sm">{message}</Text>
        {children}
      </Stack>
    </Alert>
  );
}
