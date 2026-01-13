import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PasskeySettingsModal } from "./PasskeySettingsModal";
import { usePasskey, useWebAuthnSupport } from "../../hooks/passkey";

vi.mock("../../hooks/passkey");

describe("PasskeySettingsModal", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (usePasskey as Mock).mockReturnValue({
      credentials: [],
      loading: false,
      registering: false,
      error: null,
      registerPasskey: vi.fn(),
      deletePasskey: vi.fn(),
      refreshCredentials: vi.fn(),
    });
    (useWebAuthnSupport as Mock).mockReturnValue({ isSupported: true });
  });

  describe("when closed", () => {
    it("should not render modal content", () => {
      render(<PasskeySettingsModal isOpen={false} onClose={mockOnClose} />);

      expect(screen.queryByText(/パスキー設定/i)).not.toBeInTheDocument();
    });
  });

  describe("when open", () => {
    it("should render modal with title", () => {
      render(<PasskeySettingsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText(/パスキー設定/i)).toBeInTheDocument();
    });

    it("should render close button", () => {
      render(<PasskeySettingsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByRole("button", { name: /閉じる|close/i })).toBeInTheDocument();
    });

    it("should call onClose when close button is clicked", () => {
      render(<PasskeySettingsModal isOpen={true} onClose={mockOnClose} />);

      const closeButton = screen.getByRole("button", { name: /閉じる|close/i });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("should render PasskeyManagement component", () => {
      render(<PasskeySettingsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText(/パスキー管理/i)).toBeInTheDocument();
    });

    it("should call onClose when overlay is clicked", () => {
      render(<PasskeySettingsModal isOpen={true} onClose={mockOnClose} />);

      const overlay = screen.getByTestId("modal-overlay");
      fireEvent.click(overlay);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("should not call onClose when modal content is clicked", () => {
      render(<PasskeySettingsModal isOpen={true} onClose={mockOnClose} />);

      const modalContent = screen.getByTestId("modal-content");
      fireEvent.click(modalContent);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });
});
