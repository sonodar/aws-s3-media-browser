import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MantineProvider, Button } from "@mantine/core";

// Task 1.2: MantineProvider が正しく動作することを確認するテスト

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

vi.mock("@aws-amplify/ui-react", () => ({
  Authenticator: {
    Provider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
  useAuthenticator: () => ({
    authStatus: "unauthenticated",
    signOut: vi.fn(),
  }),
}));

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
