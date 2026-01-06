import { useState } from "react";
import { Flex, Card, Button, Text, Heading, Loader, Divider } from "@aws-amplify/ui-react";
import { usePasskey, WebAuthnCredential } from "../../hooks/usePasskey";
import { useWebAuthnSupport } from "../../hooks/useWebAuthnSupport";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

interface DeleteConfirmDialogProps {
  credential: WebAuthnCredential;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmDialog({ credential, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  return (
    <Card variation="elevated" padding="large">
      <Flex direction="column" gap="medium">
        <Text>「{credential.friendlyCredentialName}」を削除しますか？</Text>
        <Flex justifyContent="flex-end" gap="small">
          <Button onClick={onCancel}>キャンセル</Button>
          <Button variation="destructive" onClick={onConfirm}>
            削除
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}

interface CredentialCardProps {
  credential: WebAuthnCredential;
  onDelete: (credentialId: string) => void;
}

function CredentialCard({ credential, onDelete }: CredentialCardProps) {
  return (
    <Card variation="outlined" padding="medium">
      <Flex justifyContent="space-between" alignItems="center">
        <Flex direction="column" gap="xs">
          <Text fontWeight="bold">{credential.friendlyCredentialName}</Text>
          <Text fontSize="small" color="font.tertiary">
            作成日: {formatDate(credential.createdAt)}
          </Text>
        </Flex>
        <Button
          variation="link"
          colorTheme="error"
          onClick={() => onDelete(credential.credentialId)}
        >
          削除
        </Button>
      </Flex>
    </Card>
  );
}

export function PasskeyManagement() {
  const { isSupported } = useWebAuthnSupport();
  const { credentials, loading, registering, error, registerPasskey, deletePasskey } = usePasskey();

  const [credentialToDelete, setCredentialToDelete] = useState<WebAuthnCredential | null>(null);

  if (!isSupported) {
    return null;
  }

  const handleDelete = (credentialId: string) => {
    const credential = credentials.find((c) => c.credentialId === credentialId);
    if (credential) {
      setCredentialToDelete(credential);
    }
  };

  const handleConfirmDelete = async () => {
    if (credentialToDelete) {
      await deletePasskey(credentialToDelete.credentialId);
      setCredentialToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setCredentialToDelete(null);
  };

  if (loading) {
    return (
      <Flex justifyContent="center" padding="large">
        <Loader />
        <Text marginLeft="small">読み込み中...</Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="medium" padding="medium">
      <Heading level={4}>パスキー管理</Heading>

      {error && (
        <Text color="font.error" variation="error">
          エラーが発生しました: {error.message}
        </Text>
      )}

      <Button
        variation="primary"
        onClick={registerPasskey}
        isLoading={registering}
        isDisabled={registering}
        loadingText="登録中..."
      >
        パスキーを登録
      </Button>

      <Divider />

      <Heading level={5}>登録済みパスキー</Heading>

      {credentials.length === 0 ? (
        <Text color="font.tertiary">登録されているパスキーはありません</Text>
      ) : (
        <Flex direction="column" gap="small">
          {credentials.map((credential) => (
            <CredentialCard
              key={credential.credentialId}
              credential={credential}
              onDelete={handleDelete}
            />
          ))}
        </Flex>
      )}

      {credentialToDelete && (
        <DeleteConfirmDialog
          credential={credentialToDelete}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
    </Flex>
  );
}
