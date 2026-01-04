import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileList } from './FileList';
import type { StorageItem } from '../../hooks/useStorage';

// Mock ThumbnailImage component
vi.mock('./ThumbnailImage', () => ({
  ThumbnailImage: ({ originalKey, fileName, fileType }: { originalKey: string; fileName: string; fileType: string }) => (
    <div data-testid="thumbnail-image" data-original-key={originalKey} data-file-name={fileName} data-file-type={fileType}>
      Mocked Thumbnail
    </div>
  ),
}));

describe('FileList', () => {
  const mockItems: StorageItem[] = [
    { key: 'folder1/', name: 'folder1', type: 'folder' },
    { key: 'photo.jpg', name: 'photo.jpg', type: 'file', size: 1024 },
    { key: 'video.mp4', name: 'video.mp4', type: 'file', size: 2048 },
  ];

  it('should render empty state when no items', () => {
    render(
      <FileList
        items={[]}
        onFolderClick={vi.fn()}
        onFileClick={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText(/ファイルがありません/)).toBeInTheDocument();
  });

  it('should render file and folder items', () => {
    render(
      <FileList
        items={mockItems}
        onFolderClick={vi.fn()}
        onFileClick={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('folder1')).toBeInTheDocument();
    expect(screen.getByText('photo.jpg')).toBeInTheDocument();
    expect(screen.getByText('video.mp4')).toBeInTheDocument();
  });

  it('should call onFolderClick when folder is clicked', () => {
    const onFolderClick = vi.fn();
    render(
      <FileList
        items={mockItems}
        onFolderClick={onFolderClick}
        onFileClick={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('folder1'));

    expect(onFolderClick).toHaveBeenCalledWith('folder1');
  });

  it('should call onFileClick when file is clicked', () => {
    const onFileClick = vi.fn();
    render(
      <FileList
        items={mockItems}
        onFolderClick={vi.fn()}
        onFileClick={onFileClick}
        onDelete={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('photo.jpg'));

    expect(onFileClick).toHaveBeenCalledWith(mockItems[1]);
  });

  it('should have file-list-item class for styling', () => {
    render(
      <FileList
        items={mockItems}
        onFolderClick={vi.fn()}
        onFileClick={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const listItems = screen.getAllByRole('listitem');
    listItems.forEach((item) => {
      // Verify that each item has the class that provides min-height: 56px (>44px)
      expect(item).toHaveClass('file-list-item');
    });
  });

  it('should show folder icon for folders', () => {
    render(
      <FileList
        items={mockItems}
        onFolderClick={vi.fn()}
        onFileClick={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    // Folder should have folder icon indicator
    const folderItem = screen.getByText('folder1').closest('li');
    expect(folderItem).toHaveAttribute('data-type', 'folder');
  });

  it('should show file icon for files', () => {
    render(
      <FileList
        items={mockItems}
        onFolderClick={vi.fn()}
        onFileClick={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const fileItem = screen.getByText('photo.jpg').closest('li');
    expect(fileItem).toHaveAttribute('data-type', 'file');
  });

  describe('thumbnail display', () => {
    it('should render ThumbnailImage for image files', () => {
      render(
        <FileList
          items={mockItems}
          onFolderClick={vi.fn()}
          onFileClick={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      const thumbnails = screen.getAllByTestId('thumbnail-image');
      const imageThumbnail = thumbnails.find(
        (t) => t.getAttribute('data-file-type') === 'image'
      );
      expect(imageThumbnail).toBeInTheDocument();
      expect(imageThumbnail).toHaveAttribute('data-file-name', 'photo.jpg');
    });

    it('should render ThumbnailImage for video files', () => {
      render(
        <FileList
          items={mockItems}
          onFolderClick={vi.fn()}
          onFileClick={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      const thumbnails = screen.getAllByTestId('thumbnail-image');
      const videoThumbnail = thumbnails.find(
        (t) => t.getAttribute('data-file-type') === 'video'
      );
      expect(videoThumbnail).toBeInTheDocument();
      expect(videoThumbnail).toHaveAttribute('data-file-name', 'video.mp4');
    });

    it('should use folder icon for folders instead of ThumbnailImage', () => {
      render(
        <FileList
          items={mockItems}
          onFolderClick={vi.fn()}
          onFileClick={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      const thumbnails = screen.getAllByTestId('thumbnail-image');
      // Should have 2 thumbnails (image + video), not 3 (no folder)
      expect(thumbnails).toHaveLength(2);
    });

    it('should pass correct originalKey to ThumbnailImage', () => {
      render(
        <FileList
          items={mockItems}
          onFolderClick={vi.fn()}
          onFileClick={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      const thumbnails = screen.getAllByTestId('thumbnail-image');
      const imageThumbnail = thumbnails.find(
        (t) => t.getAttribute('data-file-type') === 'image'
      );
      expect(imageThumbnail).toHaveAttribute('data-original-key', 'photo.jpg');
    });
  });
});
