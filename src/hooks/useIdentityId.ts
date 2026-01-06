import { useState, useEffect } from "react";
import { fetchAuthSession } from "aws-amplify/auth";

export interface UseIdentityIdReturn {
  identityId: string | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Cognito 認証セッションから Identity ID を取得・保持するフック
 */
export function useIdentityId(): UseIdentityIdReturn {
  const [identityId, setIdentityId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchAuthSession()
      .then((session) => {
        setIdentityId(session.identityId ?? null);
      })
      .catch((err: unknown) => {
        console.error("Failed to fetch auth session:", err);
        setError(err as Error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { identityId, loading, error };
}
