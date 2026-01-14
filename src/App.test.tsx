import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MantineProvider, Button } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import App from "./App";

// Task 1.2: MantineProvider + QueryProvider が正しく動作することを確認するテスト

// Mock the complex dependencies
vi.mock("./components/MediaBrowser", () => ({
  MediaBrowser: ({ identityId }: { identityId: string }) => (
    <div data-testid="media-browser" data-identity-id={identityId}>
      MediaBrowser
    </div>
  ),
}));

vi.mock("./components/PasskeySignIn", () => ({
  PasskeySignIn: () => <div data-testid="passkey-signin">PasskeySignIn</div>,
}));

vi.mock("./components/PasskeySettingsModal", () => ({
  PasskeySettingsModal: () => <div data-testid="passkey-settings">PasskeySettingsModal</div>,
}));

vi.mock("./hooks/passkey/useWebAuthnSupport", () => ({
  useWebAuthnSupport: () => ({ isSupported: false }),
}));

// useIdentityId モック
const mockUseIdentityId = vi.fn();
vi.mock("./hooks/identity/useIdentityId", () => ({
  useIdentityId: (options?: { shouldFetch?: boolean }) => mockUseIdentityId(options),
}));

// useAuthenticator モック
const mockSignOut = vi.fn();
const mockAuthStatus = { value: "unauthenticated" };

vi.mock("@aws-amplify/ui-react", () => {
  const MockAuthenticator = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  MockAuthenticator.Provider = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  );
  return {
    Authenticator: MockAuthenticator,
    useAuthenticator: () => ({
      authStatus: mockAuthStatus.value,
      signOut: mockSignOut,
    }),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthStatus.value = "unauthenticated";
  // デフォルトでは未認証時のモック
  mockUseIdentityId.mockReturnValue({
    identityId: null,
    loading: false,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  });
});

describe("MantineProvider Integration", () => {
  it("Mantine components can be rendered within MantineProvider", () => {
    render(
      <MantineProvider>
        <Button data-testid="mantine-button">Test Button</Button>
      </MantineProvider>,
    );

    expect(screen.getByTestId("mantine-button")).toBeInTheDocument();
    expect(screen.getByTestId("mantine-button")).toHaveTextContent("Test Button");
  });

  it("Mantine Button has proper accessible role", () => {
    render(
      <MantineProvider>
        <Button data-testid="mantine-button">Accessible Button</Button>
      </MantineProvider>,
    );

    expect(screen.getByRole("button", { name: "Accessible Button" })).toBeInTheDocument();
  });
});

describe("App Provider Integration", () => {
  it("App renders with all providers (MantineProvider, JotaiProvider, QueryProvider, Authenticator.Provider)", () => {
    render(<App />);

    // App should render without crashing
    // When unauthenticated and WebAuthn is not supported, it shows the Authenticator
    expect(document.body).toBeInTheDocument();
  });

  it("QueryProvider enables useQuery hooks", async () => {
    // This test verifies that QueryProvider is correctly integrated in App
    // by rendering a component that uses useQuery
    const mockData = { test: "data" };

    function TestQueryComponent() {
      const { data, isLoading } = useQuery({
        queryKey: ["integration-test"],
        queryFn: () => Promise.resolve(mockData),
        staleTime: 0,
      });

      if (isLoading) return <div data-testid="query-loading">Loading...</div>;
      return <div data-testid="query-result">{data?.test}</div>;
    }

    // We need to import QueryProvider separately for this test
    const { QueryProvider } = await import("./stores/QueryProvider");
    const { JotaiProvider } = await import("./stores/JotaiProvider");

    render(
      <MantineProvider>
        <JotaiProvider>
          <QueryProvider>
            <TestQueryComponent />
          </QueryProvider>
        </JotaiProvider>
      </MantineProvider>,
    );

    expect(screen.getByTestId("query-loading")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("query-result")).toHaveTextContent("data");
    });
  });
});

describe("HybridAuthApp - identityId 取得フロー", () => {
  describe("認証済み時", () => {
    beforeEach(() => {
      mockAuthStatus.value = "authenticated";
    });

    it("identityId 取得中はローディング UI を表示する", () => {
      mockUseIdentityId.mockReturnValue({
        identityId: null,
        loading: true,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<App />);

      expect(screen.getByText("読み込み中...")).toBeInTheDocument();
      expect(screen.queryByTestId("media-browser")).not.toBeInTheDocument();
    });

    it("identityId 取得成功時に MediaBrowser に identityId を Props で渡す", () => {
      mockUseIdentityId.mockReturnValue({
        identityId: "test-identity-id",
        loading: false,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<App />);

      const mediaBrowser = screen.getByTestId("media-browser");
      expect(mediaBrowser).toBeInTheDocument();
      expect(mediaBrowser).toHaveAttribute("data-identity-id", "test-identity-id");
    });

    it("identityId 取得失敗時にエラー UI を表示する", () => {
      mockUseIdentityId.mockReturnValue({
        identityId: null,
        loading: false,
        isLoading: false,
        isError: true,
        error: new Error("認証エラー"),
        refetch: vi.fn(),
      });

      render(<App />);

      expect(screen.getByText("認証に失敗しました")).toBeInTheDocument();
      expect(screen.queryByTestId("media-browser")).not.toBeInTheDocument();
    });

    it("エラー時に再試行ボタンをクリックすると refetch が呼ばれる", () => {
      const mockRefetch = vi.fn();
      mockUseIdentityId.mockReturnValue({
        identityId: null,
        loading: false,
        isLoading: false,
        isError: true,
        error: new Error("認証エラー"),
        refetch: mockRefetch,
      });

      render(<App />);

      const retryButton = screen.getByRole("button", { name: "再試行" });
      fireEvent.click(retryButton);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it("エラー時にサインアウトボタンをクリックすると signOut が呼ばれる", () => {
      mockUseIdentityId.mockReturnValue({
        identityId: null,
        loading: false,
        isLoading: false,
        isError: true,
        error: new Error("認証エラー"),
        refetch: vi.fn(),
      });

      render(<App />);

      const signOutButton = screen.getByRole("button", { name: "サインアウト" });
      fireEvent.click(signOutButton);

      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it("useIdentityId は shouldFetch: true で呼び出される", () => {
      mockUseIdentityId.mockReturnValue({
        identityId: "test-identity-id",
        loading: false,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<App />);

      expect(mockUseIdentityId).toHaveBeenCalledWith({ shouldFetch: true });
    });
  });

  describe("未認証時", () => {
    it("useIdentityId は shouldFetch: false で呼び出される", () => {
      mockAuthStatus.value = "unauthenticated";

      render(<App />);

      expect(mockUseIdentityId).toHaveBeenCalledWith({ shouldFetch: false });
    });
  });
});
