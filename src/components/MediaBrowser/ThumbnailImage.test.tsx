import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { ThumbnailImage } from './ThumbnailImage';

// Mock aws-amplify/storage
const mockGetUrl = vi.fn();
vi.mock('aws-amplify/storage', () => ({
  getUrl: (params: { path: string }) => mockGetUrl(params),
}));

describe('ThumbnailImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('shows placeholder while loading', () => {
      mockGetUrl.mockReturnValue(new Promise(() => {})); // Never resolves

      render(
        <ThumbnailImage
          originalKey="media/abc123/photos/image.jpg"
          fileName="image.jpg"
          fileType="image"
        />
      );

      expect(screen.getByRole('img', { hidden: true })).toHaveClass('thumbnail-loading');
    });
  });

  describe('loaded state', () => {
    it('displays thumbnail image when URL is fetched successfully', async () => {
      mockGetUrl.mockResolvedValue({
        url: new URL('https://example.com/thumbnail.jpg'),
      });

      render(
        <ThumbnailImage
          originalKey="media/abc123/photos/image.jpg"
          fileName="image.jpg"
          fileType="image"
        />
      );

      await waitFor(() => {
        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('src', 'https://example.com/thumbnail.jpg');
      });
    });

    it('uses lazy loading attribute', async () => {
      mockGetUrl.mockResolvedValue({
        url: new URL('https://example.com/thumbnail.jpg'),
      });

      render(
        <ThumbnailImage
          originalKey="media/abc123/photos/image.jpg"
          fileName="image.jpg"
          fileType="image"
        />
      );

      await waitFor(() => {
        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('loading', 'lazy');
      });
    });

    it('sets alt text to fileName', async () => {
      mockGetUrl.mockResolvedValue({
        url: new URL('https://example.com/thumbnail.jpg'),
      });

      render(
        <ThumbnailImage
          originalKey="media/abc123/photos/image.jpg"
          fileName="image.jpg"
          fileType="image"
        />
      );

      await waitFor(() => {
        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('alt', 'image.jpg');
      });
    });

    it('converts original path to thumbnail path for getUrl', async () => {
      mockGetUrl.mockResolvedValue({
        url: new URL('https://example.com/thumbnail.jpg'),
      });

      render(
        <ThumbnailImage
          originalKey="media/abc123/photos/image.jpg"
          fileName="image.jpg"
          fileType="image"
        />
      );

      await waitFor(() => {
        expect(mockGetUrl).toHaveBeenCalledWith({
          path: 'thumbnails/abc123/photos/image.jpg.thumb.jpg',
        });
      });
    });
  });

  describe('error state', () => {
    it('shows image fallback icon on error for image files', async () => {
      mockGetUrl.mockResolvedValue({
        url: new URL('https://example.com/thumbnail.jpg'),
      });

      render(
        <ThumbnailImage
          originalKey="media/abc123/photos/image.jpg"
          fileName="image.jpg"
          fileType="image"
        />
      );

      // Wait for URL to be set
      await waitFor(() => {
        expect(screen.getByRole('img')).toHaveAttribute('src');
      });

      // Simulate image load error
      fireEvent.error(screen.getByRole('img'));

      expect(screen.getByText('🖼️')).toBeInTheDocument();
    });

    it('shows video fallback icon on error for video files', async () => {
      mockGetUrl.mockResolvedValue({
        url: new URL('https://example.com/thumbnail.jpg'),
      });

      render(
        <ThumbnailImage
          originalKey="media/abc123/videos/video.mp4"
          fileName="video.mp4"
          fileType="video"
        />
      );

      // Wait for URL to be set
      await waitFor(() => {
        expect(screen.getByRole('img')).toHaveAttribute('src');
      });

      // Simulate image load error
      fireEvent.error(screen.getByRole('img'));

      expect(screen.getByText('🎬')).toBeInTheDocument();
    });

    it('shows fallback icon when getUrl fails', async () => {
      mockGetUrl.mockRejectedValue(new Error('Network error'));

      render(
        <ThumbnailImage
          originalKey="media/abc123/photos/image.jpg"
          fileName="image.jpg"
          fileType="image"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('🖼️')).toBeInTheDocument();
      });
    });
  });

  describe('container styling', () => {
    it('has fixed aspect ratio container', async () => {
      mockGetUrl.mockResolvedValue({
        url: new URL('https://example.com/thumbnail.jpg'),
      });

      const { container } = render(
        <ThumbnailImage
          originalKey="media/abc123/photos/image.jpg"
          fileName="image.jpg"
          fileType="image"
        />
      );

      const wrapper = container.querySelector('.thumbnail-container');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('initialDelay', () => {
    it('shows fallback icon initially when initialDelay is set', () => {
      vi.useFakeTimers();
      mockGetUrl.mockResolvedValue({
        url: new URL('https://example.com/thumbnail.jpg'),
      });

      render(
        <ThumbnailImage
          originalKey="media/abc123/photos/image.jpg"
          fileName="image.jpg"
          fileType="image"
          initialDelay={3000}
        />
      );

      // Should show fallback icon initially
      expect(screen.getByText('🖼️')).toBeInTheDocument();
      // getUrl should not be called yet
      expect(mockGetUrl).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('fetches thumbnail after delay expires', async () => {
      vi.useFakeTimers();
      mockGetUrl.mockResolvedValue({
        url: new URL('https://example.com/thumbnail.jpg'),
      });

      render(
        <ThumbnailImage
          originalKey="media/abc123/photos/image.jpg"
          fileName="image.jpg"
          fileType="image"
          initialDelay={3000}
        />
      );

      // Initially shows fallback
      expect(screen.getByText('🖼️')).toBeInTheDocument();

      // Advance timers using act
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      // Let microtasks flush
      await act(async () => {
        await Promise.resolve();
      });

      // Now getUrl should have been called
      expect(mockGetUrl).toHaveBeenCalledWith({
        path: 'thumbnails/abc123/photos/image.jpg.thumb.jpg',
      });

      vi.useRealTimers();
    });
  });
});
