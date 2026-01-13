import { useQuery } from "@tanstack/react-query";
import {
  listWebAuthnCredentials,
  type ListWebAuthnCredentialsOutput,
  type AuthWebAuthnCredential,
} from "aws-amplify/auth";
import { queryKeys } from "../../stores/queryKeys";

export interface WebAuthnCredential {
  credentialId: string;
  friendlyCredentialName: string;
  relyingPartyId: string;
  createdAt: Date;
}

/**
 * AuthWebAuthnCredential を WebAuthnCredential に変換
 * 必須フィールドが欠けている場合は null を返す
 */
export function toWebAuthnCredential(
  credential: AuthWebAuthnCredential,
): WebAuthnCredential | null {
  const { credentialId, friendlyCredentialName, relyingPartyId, createdAt } = credential;

  if (
    credentialId === undefined ||
    friendlyCredentialName === undefined ||
    relyingPartyId === undefined ||
    createdAt === undefined
  ) {
    return null;
  }

  return {
    credentialId,
    friendlyCredentialName,
    relyingPartyId,
    createdAt,
  };
}

/**
 * ページネーションを処理して全クレデンシャルを取得
 */
async function fetchAllCredentials(): Promise<WebAuthnCredential[]> {
  const allCredentials: WebAuthnCredential[] = [];
  let nextToken: string | undefined;

  do {
    const response: ListWebAuthnCredentialsOutput = await listWebAuthnCredentials(
      nextToken ? { nextToken } : undefined,
    );

    if (response.credentials) {
      const validCredentials = response.credentials
        .map(toWebAuthnCredential)
        .filter((c): c is WebAuthnCredential => c !== null);
      allCredentials.push(...validCredentials);
    }
    nextToken = response.nextToken;
  } while (nextToken);

  return allCredentials;
}

export interface UsePasskeyCredentialsReturn {
  data: WebAuthnCredential[] | undefined;
  isLoading: boolean;
  error: Error | null;
}

/**
 * WebAuthn クレデンシャル一覧を取得するフック
 *
 * TanStack Query を使用してクレデンシャルをキャッシュ管理
 * - ページネーションを自動処理して全件取得
 * - retry: false で認証エラーはリトライしない
 */
export function usePasskeyCredentials(): UsePasskeyCredentialsReturn {
  const query = useQuery({
    queryKey: queryKeys.passkeys(),
    queryFn: fetchAllCredentials,
    retry: false,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}
