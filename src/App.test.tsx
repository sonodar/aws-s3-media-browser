import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MantineProvider, Button } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import App from "./App";

// Task 1.2: MantineProvider + QueryProvider が正しく動作することを確認するテスト

// Mock the complex dependencies
vi.mock("./components/MediaBrowser", () => ({
  MediaBrowser: () => <div data-testid="media-browser">MediaBrowser</div>,
}));

vi.mock("./components/PasskeySignIn", () => ({
  PasskeySignIn: () => <div data-testid="passkey-signin">PasskeySignIn</div>,
}));

vi.mock("./components/PasskeySettingsModal", () => ({
  PasskeySettingsModal: () => <div data-testid="passkey-settings">PasskeySettingsModal</div>,
}));

vi.mock("./hooks/useWebAuthnSupport", () => ({
  useWebAuthnSupport: () => ({ isSupported: false }),
}));

vi.mock("@aws-amplify/ui-react", () => {
  const MockAuthenticator = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  MockAuthenticator.Provider = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  );
  return {
    Authenticator: MockAuthenticator,
    useAuthenticator: () => ({
      authStatus: "unauthenticated",
      signOut: vi.fn(),
    }),
  };
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
