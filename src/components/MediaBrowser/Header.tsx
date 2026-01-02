import './Header.css';

interface HeaderProps {
  currentPath: string;
  onBack: () => void;
  onSignOut: () => void;
}

export function Header({ currentPath, onBack, onSignOut }: HeaderProps) {
  const pathParts = currentPath.split('/').filter(Boolean);
  const currentFolder = pathParts[pathParts.length - 1] || null;

  return (
    <header className="media-browser-header">
      <div className="header-left">
        {currentPath && (
          <button
            className="back-button"
            onClick={onBack}
            aria-label="戻る"
          >
            ←
          </button>
        )}
        <div className="header-title">
          <h1>S3 Media Browser</h1>
          {currentFolder && (
            <span className="current-folder">{currentFolder}</span>
          )}
        </div>
      </div>
      <button
        className="signout-button"
        onClick={onSignOut}
        aria-label="サインアウト"
      >
        サインアウト
      </button>
    </header>
  );
}
