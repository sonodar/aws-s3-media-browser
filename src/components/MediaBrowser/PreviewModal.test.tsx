import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PreviewModal } from './PreviewModal';
import type { StorageItem } from '../../types/storage';

// Mock the lightbox component
vi.mock('yet-another-react-lightbox', () => ({
  default: ({ open, close, toolbar }: { open: boolean; close: () => void; toolbar?: { buttons?: React.ReactNode[] } }) => {
    if (!open) return null;
    return (
      <div data-testid="lightbox">
        <div data-testid="toolbar">
          {toolbar?.buttons?.map((button, index) => (
            <span key={index}>{button}</span>
          ))}
        </div>
        <button onClick={close} data-testid="close-button">Close</button>
      </div>
    );
  },
}));

vi.mock('yet-another-react-lightbox/plugins/video', () => ({
  default: vi.fn(),
}));

vi.mock('yet-another-react-lightbox/plugins/zoom', () => ({
  default: vi.fn(),
}));

describe('PreviewModal', () => {
  const mockOnClose = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnRename = vi.fn();
  const mockGetFileUrl = vi.fn();

  const mockFileItem: StorageItem = {
    key: 'photos/test-image.jpg',
    name: 'test-image.jpg',
    type: 'file',
    size: 1024,
    lastModified: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFileUrl.mockResolvedValue('https://example.com/test-image.jpg');
  });

  describe('Rename Button', () => {
    it('should display rename button in toolbar when onRename is provided', async () => {
      render(
        <PreviewModal
          isOpen={true}
          onClose={mockOnClose}
          item={mockFileItem}
          getFileUrl={mockGetFileUrl}
          onDelete={mockOnDelete}
          onRename={mockOnRename}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('lightbox')).toBeInTheDocument();
      });

      const renameButton = screen.getByRole('button', { name: 'リネーム' });
      expect(renameButton).toBeInTheDocument();
    });

    it('should not display rename button when onRename is not provided', async () => {
      render(
        <PreviewModal
          isOpen={true}
          onClose={mockOnClose}
          item={mockFileItem}
          getFileUrl={mockGetFileUrl}
          onDelete={mockOnDelete}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('lightbox')).toBeInTheDocument();
      });

      const renameButton = screen.queryByRole('button', { name: 'リネーム' });
      expect(renameButton).not.toBeInTheDocument();
    });

    it('should call onRename with item and close preview when rename button is clicked', async () => {
      render(
        <PreviewModal
          isOpen={true}
          onClose={mockOnClose}
          item={mockFileItem}
          getFileUrl={mockGetFileUrl}
          onDelete={mockOnDelete}
          onRename={mockOnRename}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('lightbox')).toBeInTheDocument();
      });

      const renameButton = screen.getByRole('button', { name: 'リネーム' });
      fireEvent.click(renameButton);

      expect(mockOnRename).toHaveBeenCalledWith(mockFileItem);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
