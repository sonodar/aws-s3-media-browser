import { useState, useEffect, useCallback } from "react";
import {
  listWebAuthnCredentials,
  associateWebAuthnCredential,
  deleteWebAuthnCredential,
  ListWebAuthnCredentialsOutput,
  AuthWebAuthnCredential,
} from "aws-amplify/auth";

export interface WebAuthnCredential {
  credentialId: string;
  friendlyCredentialName: string;
  relyingPartyId: string;
  createdAt: Date;
}

function toWebAuthnCredential(credential: AuthWebAuthnCredential): WebAuthnCredential | null {
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

export interface UsePasskeyReturn {
  credentials: WebAuthnCredential[];
  loading: boolean;
  registering: boolean;
  error: Error | null;
  registerPasskey: () => Promise<void>;
  deletePasskey: (credentialId: string) => Promise<void>;
  refreshCredentials: () => Promise<void>;
}

export function usePasskey(): UsePasskeyReturn {
  const [credentials, setCredentials] = useState<WebAuthnCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCredentials = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
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

      setCredentials(allCredentials);
    } catch (err) {
      setError(err as Error);
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const registerPasskey = useCallback(async () => {
    setRegistering(true);
    setError(null);

    try {
      await associateWebAuthnCredential();
      await fetchCredentials();
    } catch (err) {
      setError(err as Error);
    } finally {
      setRegistering(false);
    }
  }, [fetchCredentials]);

  const deletePasskey = useCallback(
    async (credentialId: string) => {
      setError(null);

      try {
        await deleteWebAuthnCredential({ credentialId });
        await fetchCredentials();
      } catch (err) {
        setError(err as Error);
      }
    },
    [fetchCredentials],
  );

  const refreshCredentials = useCallback(async () => {
    await fetchCredentials();
  }, [fetchCredentials]);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  return {
    credentials,
    loading,
    registering,
    error,
    registerPasskey,
    deletePasskey,
    refreshCredentials,
  };
}
