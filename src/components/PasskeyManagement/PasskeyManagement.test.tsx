import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PasskeyManagement } from "./PasskeyManagement";
import { usePasskey } from "../../hooks/usePasskey";
import { useWebAuthnSupport } from "../../hooks/useWebAuthnSupport";

vi.mock("../../hooks/usePasskey");
vi.mock("../../hooks/useWebAuthnSupport");

describe("PasskeyManagement", () => {
  const mockCredentials = [
    {
      credentialId: "cred-1",
      friendlyCredentialName: "My MacBook",
      relyingPartyId: "localhost",
      createdAt: new Date("2024-01-01T00:00:00Z"),
    },
    {
      credentialId: "cred-2",
      friendlyCredentialName: "My iPhone",
      relyingPartyId: "localhost",
      createdAt: new Date("2024-01-02T00:00:00Z"),
    },
  ];

  const mockUsePasskey = {
    credentials: mockCredentials,
    loading: false,
    registering: false,
    error: null,
    registerPasskey: vi.fn(),
    deletePasskey: vi.fn(),
    refreshCredentials: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (usePasskey as Mock).mockReturnValue(mockUsePasskey);
    (useWebAuthnSupport as Mock).mockReturnValue({ isSupported: true });
  });

  describe("when WebAuthn is not supported", () => {
    beforeEach(() => {
      (useWebAuthnSupport as Mock).mockReturnValue({ isSupported: false });
    });

    it("should not render anything", () => {
      const { container } = render(<PasskeyManagement />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("when WebAuthn is supported", () => {
    describe("rendering", () => {
      it("should render register button", () => {
        render(<PasskeyManagement />);
        expect(screen.getByRole("button", { name: /パスキーを登録/i })).toBeInTheDocument();
      });

      it("should render credentials list", () => {
        render(<PasskeyManagement />);
        expect(screen.getByText("My MacBook")).toBeInTheDocument();
        expect(screen.getByText("My iPhone")).toBeInTheDocument();
      });

      it("should render delete button for each credential", () => {
        render(<PasskeyManagement />);
        const deleteButtons = screen.getAllByRole("button", { name: /削除/i });
        expect(deleteButtons).toHaveLength(2);
      });

      it("should show loading state", () => {
        (usePasskey as Mock).mockReturnValue({
          ...mockUsePasskey,
          loading: true,
        });

        render(<PasskeyManagement />);
        expect(screen.getByText(/読み込み中/i)).toBeInTheDocument();
      });

      it("should show error state", () => {
        (usePasskey as Mock).mockReturnValue({
          ...mockUsePasskey,
          error: new Error("Test error"),
        });

        render(<PasskeyManagement />);
        expect(screen.getByText(/エラー/i)).toBeInTheDocument();
      });

      it("should show empty state when no credentials", () => {
        (usePasskey as Mock).mockReturnValue({
          ...mockUsePasskey,
          credentials: [],
        });

        render(<PasskeyManagement />);
        expect(screen.getByText(/登録されているパスキーはありません/i)).toBeInTheDocument();
      });
    });

    describe("register passkey", () => {
      it("should call registerPasskey when register button is clicked", async () => {
        render(<PasskeyManagement />);

        const registerButton = screen.getByRole("button", {
          name: /パスキーを登録/i,
        });
        fireEvent.click(registerButton);

        expect(mockUsePasskey.registerPasskey).toHaveBeenCalled();
      });

      it("should disable register button while registering", () => {
        (usePasskey as Mock).mockReturnValue({
          ...mockUsePasskey,
          registering: true,
        });

        render(<PasskeyManagement />);

        const registerButton = screen.getByRole("button", {
          name: /登録中/i,
        });
        expect(registerButton).toBeDisabled();
      });
    });

    describe("delete passkey", () => {
      it("should show confirmation dialog when delete is clicked", async () => {
        render(<PasskeyManagement />);

        const deleteButtons = screen.getAllByRole("button", { name: /削除/i });
        fireEvent.click(deleteButtons[0]);

        await waitFor(() => {
          expect(screen.getByText(/削除しますか/i)).toBeInTheDocument();
        });
      });

      it("should call deletePasskey when deletion is confirmed", async () => {
        render(<PasskeyManagement />);

        const deleteButtons = screen.getAllByRole("button", { name: /削除/i });
        fireEvent.click(deleteButtons[0]);

        await waitFor(() => {
          expect(screen.getByText(/削除しますか/i)).toBeInTheDocument();
        });

        // Find the destructive button in the dialog (it has amplify-button--destructive class)
        const confirmButtons = screen.getAllByRole("button", { name: /^削除$/i });
        const confirmButton = confirmButtons.find((btn) => btn.className.includes("destructive"));
        expect(confirmButton).toBeDefined();
        fireEvent.click(confirmButton!);

        await waitFor(() => {
          expect(mockUsePasskey.deletePasskey).toHaveBeenCalledWith("cred-1");
        });
      });

      it("should close dialog when cancel is clicked", async () => {
        render(<PasskeyManagement />);

        const deleteButtons = screen.getAllByRole("button", { name: /削除/i });
        fireEvent.click(deleteButtons[0]);

        await waitFor(() => {
          expect(screen.getByText(/削除しますか/i)).toBeInTheDocument();
        });

        const cancelButton = screen.getByRole("button", { name: /キャンセル/i });
        fireEvent.click(cancelButton);

        await waitFor(() => {
          expect(screen.queryByText(/削除しますか/i)).not.toBeInTheDocument();
        });

        expect(mockUsePasskey.deletePasskey).not.toHaveBeenCalled();
      });
    });
  });
});
