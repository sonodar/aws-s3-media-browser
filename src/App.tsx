import { useState, useCallback } from "react";
import { MantineProvider, Center, Loader, Stack, Text, Button, Group } from "@mantine/core";
import { Authenticator, useAuthenticator } from "@aws-amplify/ui-react";
import { MediaBrowser } from "./components/MediaBrowser";
import { PasskeySignIn } from "./components/PasskeySignIn";
import { PasskeySettingsModal } from "./components/PasskeySettingsModal";
import { useWebAuthnSupport } from "./hooks/passkey";
import { useIdentityId } from "./hooks/identity/useIdentityId";
import { JotaiProvider } from "./stores/JotaiProvider";
import { QueryProvider } from "./stores/QueryProvider";
import "@aws-amplify/ui-react/styles.css";

type AuthMode = "passkey" | "password";

interface AuthenticatedAppProps {
  identityId: string;
  onSignOut: () => void;
}

function AuthenticatedApp({ identityId, onSignOut }: AuthenticatedAppProps) {
  const [showSettings, setShowSettings] = useState(false);

  const handleOpenSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setShowSettings(false);
  }, []);

  return (
    <>
      <MediaBrowser
        identityId={identityId}
        onSignOut={onSignOut}
        onOpenSettings={handleOpenSettings}
      />
      <PasskeySettingsModal isOpen={showSettings} onClose={handleCloseSettings} />
    </>
  );
}

function HybridAuthApp() {
  const { isSupported: isWebAuthnSupported } = useWebAuthnSupport();
  const [authMode, setAuthMode] = useState<AuthMode>("passkey");
  const [isPasskeyAuthenticated, setIsPasskeyAuthenticated] = useState(false);
  const { authStatus, signOut } = useAuthenticator((context) => [context.authStatus]);

  const isAuthenticated = isPasskeyAuthenticated || authStatus === "authenticated";
  const { identityId, isLoading, isError, refetch } = useIdentityId({
    shouldFetch: isAuthenticated,
  });

  const handlePasskeySuccess = useCallback(() => {
    setIsPasskeyAuthenticated(true);
  }, []);

  const handleSwitchToPassword = useCallback(() => {
    setAuthMode("password");
  }, []);

  const handleSwitchToPasskey = useCallback(() => {
    setAuthMode("passkey");
  }, []);

  const handleSignOut = useCallback(() => {
    setIsPasskeyAuthenticated(false);
    setAuthMode("passkey");
    signOut();
  }, [signOut]);

  // If already authenticated (either via passkey or password)
  if (isAuthenticated) {
    // ローディング中
    if (isLoading) {
      return (
        <Center h="100vh">
          <Stack align="center">
            <Loader size="lg" />
            <Text>読み込み中...</Text>
          </Stack>
        </Center>
      );
    }

    // エラー時 or identityId が取得できなかった
    if (isError || !identityId) {
      return (
        <Center h="100vh">
          <Stack align="center">
            <Text c="red" size="lg">
              認証に失敗しました
            </Text>
            <Group>
              <Button onClick={refetch}>再試行</Button>
              <Button variant="outline" onClick={handleSignOut}>
                サインアウト
              </Button>
            </Group>
          </Stack>
        </Center>
      );
    }

    return <AuthenticatedApp identityId={identityId} onSignOut={handleSignOut} />;
  }

  // Passkey authentication mode
  if (isWebAuthnSupported && authMode === "passkey") {
    return (
      <PasskeySignIn onSuccess={handlePasskeySuccess} onSwitchToPassword={handleSwitchToPassword} />
    );
  }

  // Password authentication mode (or WebAuthn not supported)
  // 注: Authenticator の認証成功後は authStatus === "authenticated" となり、
  // 上の if (isAuthenticated) 分岐で処理されるため、children は呼び出されない
  return (
    <div className="password-auth-container">
      <Authenticator hideSignUp />
      {isWebAuthnSupported && (
        <div className="auth-switch-container">
          <button className="switch-auth-button" onClick={handleSwitchToPasskey}>
            パスキーでサインイン
          </button>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <MantineProvider>
      <JotaiProvider>
        <QueryProvider>
          <Authenticator.Provider>
            <HybridAuthApp />
          </Authenticator.Provider>
        </QueryProvider>
      </JotaiProvider>
    </MantineProvider>
  );
}

export default App;
