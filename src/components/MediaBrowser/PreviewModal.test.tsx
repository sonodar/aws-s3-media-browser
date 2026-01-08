import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PreviewModal } from "./PreviewModal";
import type { StorageItem } from "../../types/storage";

// Variables to capture Lightbox props
let capturedProps: {
  index?: number;
  slides?: unknown[];
  controller?: { closeOnPullDown?: boolean };
  carousel?: { finite?: boolean };
  on?: { view?: (data: { index: number }) => void };
} = {};

// Mock the lightbox component
vi.mock("yet-another-react-lightbox", () => ({
  default: (props: {
    open: boolean;
    close: () => void;
    toolbar?: { buttons?: React.ReactNode[] };
    index?: number;
    slides?: unknown[];
    controller?: { closeOnPullDown?: boolean };
    carousel?: { finite?: boolean };
    on?: { view?: (data: { index: number }) => void };
  }) => {
    capturedProps = {
      index: props.index,
      slides: props.slides,
      controller: props.controller,
      carousel: props.carousel,
      on: props.on,
    };
    if (!props.open) return null;
    return (
      <div data-testid="lightbox" data-index={props.index} data-slides-count={props.slides?.length}>
        <div data-testid="toolbar">
          {props.toolbar?.buttons?.map((button, index) => (
            <span key={index}>{button}</span>
          ))}
        </div>
        <button onClick={props.close} data-testid="close-button">
          Close
        </button>
        {/* Simulate prev/next buttons for testing index change */}
        {props.on?.view && (
          <>
            <button
              data-testid="prev-button"
              onClick={() => props.on?.view?.({ index: (props.index ?? 0) - 1 })}
            >
              Prev
            </button>
            <button
              data-testid="next-button"
              onClick={() => props.on?.view?.({ index: (props.index ?? 0) + 1 })}
            >
              Next
            </button>
          </>
        )}
      </div>
    );
  },
}));

vi.mock("yet-another-react-lightbox/plugins/video", () => ({
  default: vi.fn(),
}));

vi.mock("yet-another-react-lightbox/plugins/zoom", () => ({
  default: vi.fn(),
}));

describe("PreviewModal", () => {
  const mockOnClose = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnRename = vi.fn();
  const mockGetFileUrl = vi.fn();

  const mockFileItem: StorageItem = {
    key: "photos/test-image.jpg",
    name: "test-image.jpg",
    type: "file",
    size: 1024,
    lastModified: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFileUrl.mockResolvedValue("https://example.com/test-image.jpg");
  });

  describe("Rename Button", () => {
    it("should display rename button in toolbar when onRename is provided", async () => {
      render(
        <PreviewModal
          isOpen={true}
          onClose={mockOnClose}
          item={mockFileItem}
          getFileUrl={mockGetFileUrl}
          onDelete={mockOnDelete}
          onRename={mockOnRename}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("lightbox")).toBeInTheDocument();
      });

      const renameButton = screen.getByRole("button", { name: "リネーム" });
      expect(renameButton).toBeInTheDocument();
    });

    it("should not display rename button when onRename is not provided", async () => {
      render(
        <PreviewModal
          isOpen={true}
          onClose={mockOnClose}
          item={mockFileItem}
          getFileUrl={mockGetFileUrl}
          onDelete={mockOnDelete}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("lightbox")).toBeInTheDocument();
      });

      const renameButton = screen.queryByRole("button", { name: "リネーム" });
      expect(renameButton).not.toBeInTheDocument();
    });

    it("should call onRename with item and close preview when rename button is clicked", async () => {
      render(
        <PreviewModal
          isOpen={true}
          onClose={mockOnClose}
          item={mockFileItem}
          getFileUrl={mockGetFileUrl}
          onDelete={mockOnDelete}
          onRename={mockOnRename}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("lightbox")).toBeInTheDocument();
      });

      const renameButton = screen.getByRole("button", { name: "リネーム" });
      fireEvent.click(renameButton);

      expect(mockOnRename).toHaveBeenCalledWith(mockFileItem);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Multiple Slides Mode", () => {
    const mockItems: StorageItem[] = [
      { key: "photos/image1.jpg", name: "image1.jpg", type: "file", size: 1024 },
      { key: "photos/image2.jpg", name: "image2.jpg", type: "file", size: 2048 },
      { key: "photos/video.mp4", name: "video.mp4", type: "file", size: 4096 },
    ];
    const mockOnIndexChange = vi.fn();

    beforeEach(() => {
      capturedProps = {};
    });

    it("should accept items, currentIndex, and onIndexChange props", async () => {
      render(
        <PreviewModal
          isOpen={true}
          onClose={mockOnClose}
          items={mockItems}
          currentIndex={0}
          onIndexChange={mockOnIndexChange}
          getFileUrl={mockGetFileUrl}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("lightbox")).toBeInTheDocument();
      });

      // Should have 3 slides
      expect(capturedProps.slides?.length).toBe(3);
    });

    it("should pass currentIndex to Lightbox index prop", async () => {
      render(
        <PreviewModal
          isOpen={true}
          onClose={mockOnClose}
          items={mockItems}
          currentIndex={1}
          onIndexChange={mockOnIndexChange}
          getFileUrl={mockGetFileUrl}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("lightbox")).toBeInTheDocument();
      });

      expect(capturedProps.index).toBe(1);
    });

    it("should call onIndexChange when slide changes", async () => {
      render(
        <PreviewModal
          isOpen={true}
          onClose={mockOnClose}
          items={mockItems}
          currentIndex={1}
          onIndexChange={mockOnIndexChange}
          getFileUrl={mockGetFileUrl}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("lightbox")).toBeInTheDocument();
      });

      // Simulate view change (next slide)
      fireEvent.click(screen.getByTestId("next-button"));
      expect(mockOnIndexChange).toHaveBeenCalledWith(2);
    });

    it("should enable closeOnPullDown for swipe-to-close", async () => {
      render(
        <PreviewModal
          isOpen={true}
          onClose={mockOnClose}
          items={mockItems}
          currentIndex={0}
          onIndexChange={mockOnIndexChange}
          getFileUrl={mockGetFileUrl}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("lightbox")).toBeInTheDocument();
      });

      expect(capturedProps.controller?.closeOnPullDown).toBe(true);
    });

    it("should maintain carousel.finite: true for edge swipe restriction", async () => {
      render(
        <PreviewModal
          isOpen={true}
          onClose={mockOnClose}
          items={mockItems}
          currentIndex={0}
          onIndexChange={mockOnIndexChange}
          getFileUrl={mockGetFileUrl}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("lightbox")).toBeInTheDocument();
      });

      expect(capturedProps.carousel?.finite).toBe(true);
    });

    it("should display caption for current item", async () => {
      render(
        <PreviewModal
          isOpen={true}
          onClose={mockOnClose}
          items={mockItems}
          currentIndex={1}
          onIndexChange={mockOnIndexChange}
          getFileUrl={mockGetFileUrl}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("lightbox")).toBeInTheDocument();
      });

      expect(screen.getByText("image2.jpg")).toBeInTheDocument();
    });

    it("should call onDelete with current item in multi-slide mode", async () => {
      render(
        <PreviewModal
          isOpen={true}
          onClose={mockOnClose}
          items={mockItems}
          currentIndex={1}
          onIndexChange={mockOnIndexChange}
          getFileUrl={mockGetFileUrl}
          onDelete={mockOnDelete}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("lightbox")).toBeInTheDocument();
      });

      // Click the toolbar delete button (first one)
      const deleteButtons = screen.getAllByRole("button", { name: "削除" });
      fireEvent.click(deleteButtons[0]);

      // Wait for dialog and click the confirm button (second one in DOM)
      await waitFor(() => {
        expect(screen.getAllByRole("button", { name: "削除" }).length).toBeGreaterThan(1);
      });
      const allDeleteButtons = screen.getAllByRole("button", { name: "削除" });
      fireEvent.click(allDeleteButtons[1]);
      expect(mockOnDelete).toHaveBeenCalledWith(mockItems[1]);
    });
  });
});
