import { useState, useEffect } from "react";

export interface UseWebAuthnSupportReturn {
  isSupported: boolean;
  isLoading: boolean;
}

export function useWebAuthnSupport(): UseWebAuthnSupportReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSupport = async () => {
      // Check if PublicKeyCredential API exists
      if (typeof window.PublicKeyCredential === "undefined") {
        setIsSupported(false);
        setIsLoading(false);
        return;
      }

      try {
        // Check if platform authenticator is available
        const available =
          await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setIsSupported(available);
      } catch {
        setIsSupported(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSupport();
  }, []);

  return { isSupported, isLoading };
}
