import { useState, useCallback } from 'react';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import { MediaBrowser } from './components/MediaBrowser';
import { PasskeySignIn } from './components/PasskeySignIn';
import { PasskeySettingsModal } from './components/PasskeySettingsModal';
import { useWebAuthnSupport } from './hooks/useWebAuthnSupport';
import '@aws-amplify/ui-react/styles.css';

type AuthMode = 'passkey' | 'password';

function AuthenticatedApp({
  onSignOut,
}: {
  onSignOut: () => void;
}) {
  const [showSettings, setShowSettings] = useState(false);

  const handleOpenSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setShowSettings(false);
  }, []);

  return (
    <>
      <MediaBrowser onSignOut={onSignOut} onOpenSettings={handleOpenSettings} />
      <PasskeySettingsModal isOpen={showSettings} onClose={handleCloseSettings} />
    </>
  );
}

function HybridAuthApp() {
  const { isSupported: isWebAuthnSupported } = useWebAuthnSupport();
  const [authMode, setAuthMode] = useState<AuthMode>('passkey');
  const [isPasskeyAuthenticated, setIsPasskeyAuthenticated] = useState(false);
  const { authStatus, signOut } = useAuthenticator((context) => [context.authStatus]);

  const handlePasskeySuccess = useCallback(() => {
    setIsPasskeyAuthenticated(true);
  }, []);

  const handleSwitchToPassword = useCallback(() => {
    setAuthMode('password');
  }, []);

  const handleSwitchToPasskey = useCallback(() => {
    setAuthMode('passkey');
  }, []);

  const handleSignOut = useCallback(() => {
    setIsPasskeyAuthenticated(false);
    setAuthMode('passkey');
    signOut();
  }, [signOut]);

  // If already authenticated (either via passkey or password)
  if (isPasskeyAuthenticated || authStatus === 'authenticated') {
    return <AuthenticatedApp onSignOut={handleSignOut} />;
  }

  // Passkey authentication mode
  if (isWebAuthnSupported && authMode === 'passkey') {
    return (
      <PasskeySignIn
        onSuccess={handlePasskeySuccess}
        onSwitchToPassword={handleSwitchToPassword}
      />
    );
  }

  // Password authentication mode (or WebAuthn not supported)
  return (
    <div className="password-auth-container">
      <Authenticator hideSignUp>
        {({ signOut: authSignOut }) => (
          <AuthenticatedApp onSignOut={authSignOut ?? (() => {})} />
        )}
      </Authenticator>
      {isWebAuthnSupported && (
        <div className="auth-switch-container">
          <button
            className="switch-auth-button"
            onClick={handleSwitchToPasskey}
          >
            パスキーでサインイン
          </button>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <Authenticator.Provider>
      <HybridAuthApp />
    </Authenticator.Provider>
  );
}

export default App;
