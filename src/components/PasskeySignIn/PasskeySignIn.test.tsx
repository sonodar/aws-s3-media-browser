import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PasskeySignIn } from "./PasskeySignIn";
import { signIn } from "aws-amplify/auth";

vi.mock("aws-amplify/auth", () => ({
  signIn: vi.fn(),
}));

describe("PasskeySignIn", () => {
  const mockOnSuccess = vi.fn();
  const mockOnSwitchToPassword = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render email input field", () => {
      render(
        <PasskeySignIn onSuccess={mockOnSuccess} onSwitchToPassword={mockOnSwitchToPassword} />,
      );

      expect(screen.getByLabelText(/メールアドレス|email/i)).toBeInTheDocument();
    });

    it("should render sign in button", () => {
      render(
        <PasskeySignIn onSuccess={mockOnSuccess} onSwitchToPassword={mockOnSwitchToPassword} />,
      );

      expect(screen.getByRole("button", { name: /パスキーでサインイン/i })).toBeInTheDocument();
    });

    it("should render switch to password link", () => {
      render(
        <PasskeySignIn onSuccess={mockOnSuccess} onSwitchToPassword={mockOnSwitchToPassword} />,
      );

      expect(screen.getByText(/パスワードでサインイン/i)).toBeInTheDocument();
    });
  });

  describe("sign in flow", () => {
    it("should call signIn with correct parameters on form submit", async () => {
      (signIn as Mock).mockResolvedValue({
        nextStep: { signInStep: "DONE" },
      });

      render(
        <PasskeySignIn onSuccess={mockOnSuccess} onSwitchToPassword={mockOnSwitchToPassword} />,
      );

      const emailInput = screen.getByLabelText(/メールアドレス|email/i);
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      const signInButton = screen.getByRole("button", {
        name: /パスキーでサインイン/i,
      });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(signIn).toHaveBeenCalledWith({
          username: "test@example.com",
          options: {
            authFlowType: "USER_AUTH",
            preferredChallenge: "WEB_AUTHN",
          },
        });
      });
    });

    it("should call onSuccess when sign in completes", async () => {
      (signIn as Mock).mockResolvedValue({
        nextStep: { signInStep: "DONE" },
      });

      render(
        <PasskeySignIn onSuccess={mockOnSuccess} onSwitchToPassword={mockOnSwitchToPassword} />,
      );

      const emailInput = screen.getByLabelText(/メールアドレス|email/i);
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      const signInButton = screen.getByRole("button", {
        name: /パスキーでサインイン/i,
      });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it("should display error message on sign in failure", async () => {
      (signIn as Mock).mockRejectedValue(new Error("Sign in failed"));

      render(
        <PasskeySignIn onSuccess={mockOnSuccess} onSwitchToPassword={mockOnSwitchToPassword} />,
      );

      const emailInput = screen.getByLabelText(/メールアドレス|email/i);
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      const signInButton = screen.getByRole("button", {
        name: /パスキーでサインイン/i,
      });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText(/サインインに失敗しました/i)).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it("should show loading state during sign in", async () => {
      let resolveSignIn: (value: unknown) => void;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });
      (signIn as Mock).mockReturnValue(signInPromise);

      render(
        <PasskeySignIn onSuccess={mockOnSuccess} onSwitchToPassword={mockOnSwitchToPassword} />,
      );

      const emailInput = screen.getByLabelText(/メールアドレス|email/i);
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      const signInButton = screen.getByRole("button", {
        name: /パスキーでサインイン/i,
      });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(signInButton).toBeDisabled();
      });

      resolveSignIn!({ nextStep: { signInStep: "DONE" } });

      await waitFor(() => {
        expect(signInButton).not.toBeDisabled();
      });
    });
  });

  describe("switch to password", () => {
    it("should call onSwitchToPassword when link is clicked", () => {
      render(
        <PasskeySignIn onSuccess={mockOnSuccess} onSwitchToPassword={mockOnSwitchToPassword} />,
      );

      const switchLink = screen.getByText(/パスワードでサインイン/i);
      fireEvent.click(switchLink);

      expect(mockOnSwitchToPassword).toHaveBeenCalled();
    });
  });

  describe("validation", () => {
    it("should require email before sign in", async () => {
      render(
        <PasskeySignIn onSuccess={mockOnSuccess} onSwitchToPassword={mockOnSwitchToPassword} />,
      );

      const signInButton = screen.getByRole("button", {
        name: /パスキーでサインイン/i,
      });
      fireEvent.click(signInButton);

      expect(signIn).not.toHaveBeenCalled();
    });
  });
});
