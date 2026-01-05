import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useStorageOperations } from './useStorageOperations';

// Mock aws-amplify/storage
vi.mock('aws-amplify/storage', () => ({
  list: vi.fn(),
  remove: vi.fn(),
  uploadData: vi.fn(),
  getUrl: vi.fn(),
}));

// Mock aws-amplify/auth to prevent interference with other test files
vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn(),
}));

import { list, remove, uploadData, getUrl } from 'aws-amplify/storage';

describe('useStorageOperations', () => {
  const identityId = 'test-identity-id';
  const currentPath = '';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should start with loading true when identityId is provided', () => {
      vi.mocked(list).mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() =>
        useStorageOperations({ identityId, currentPath })
      );

      expect(result.current.loading).toBe(true);
      expect(result.current.items).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should not fetch when identityId is null', () => {
      const { result } = renderHook(() =>
        useStorageOperations({ identityId: null, currentPath })
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.items).toEqual([]);
      expect(list).not.toHaveBeenCalled();
    });
  });

  describe('fetchItems', () => {
    it('should fetch and parse items correctly', async () => {
      const basePath = `media/${identityId}/`;
      vi.mocked(list).mockResolvedValue({
        items: [
          { path: `${basePath}photo.jpg`, size: 1024, lastModified: new Date() },
          { path: `${basePath}folder/`, size: 0, lastModified: new Date() },
        ],
      });

      const { result } = renderHook(() =>
        useStorageOperations({ identityId, currentPath })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.items).toHaveLength(2);
      expect(result.current.items[0].type).toBe('folder');
      expect(result.current.items[1].type).toBe('file');
    });

    it('should set error on list failure', async () => {
      const mockError = new Error('Network error');
      vi.mocked(list).mockRejectedValue(mockError);

      const { result } = renderHook(() =>
        useStorageOperations({ identityId, currentPath })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(mockError);
    });

    it('should refetch when currentPath changes', async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });

      const { result, rerender } = renderHook(
        ({ path }) => useStorageOperations({ identityId, currentPath: path }),
        { initialProps: { path: '' } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(list).toHaveBeenCalledTimes(1);

      rerender({ path: 'subfolder' });

      await waitFor(() => {
        expect(list).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('uploadFiles', () => {
    it('should upload files and return uploaded keys', async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });
      vi.mocked(uploadData).mockResolvedValue({ path: 'test', result: Promise.resolve({}) } as never);

      const { result } = renderHook(() =>
        useStorageOperations({ identityId, currentPath })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const file1 = new File(['content1'], 'file1.txt', { type: 'text/plain' });
      const file2 = new File(['content2'], 'file2.txt', { type: 'text/plain' });

      let uploadedKeys: string[] = [];
      await act(async () => {
        uploadedKeys = await result.current.uploadFiles([file1, file2]);
      });

      expect(uploadData).toHaveBeenCalledTimes(2);
      expect(uploadedKeys).toEqual([
        `media/${identityId}/file1.txt`,
        `media/${identityId}/file2.txt`,
      ]);
    });

    it('should refresh items after upload', async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });
      vi.mocked(uploadData).mockResolvedValue({ path: 'test', result: Promise.resolve({}) } as never);

      const { result } = renderHook(() =>
        useStorageOperations({ identityId, currentPath })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const file = new File(['content'], 'file.txt', { type: 'text/plain' });

      await act(async () => {
        await result.current.uploadFiles([file]);
      });

      // Initial fetch + refresh after upload
      expect(list).toHaveBeenCalledTimes(2);
    });
  });

  describe('removeItem', () => {
    it('should remove item and refresh list', async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });
      vi.mocked(remove).mockResolvedValue({ path: 'test' });

      const { result } = renderHook(() =>
        useStorageOperations({ identityId, currentPath })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.removeItem('some/key/file.jpg');
      });

      expect(remove).toHaveBeenCalledWith({ path: 'some/key/file.jpg' });
      // Initial fetch + refresh after remove
      expect(list).toHaveBeenCalledTimes(2);
    });
  });

  describe('createFolder', () => {
    it('should create folder and refresh list', async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });
      vi.mocked(uploadData).mockResolvedValue({ path: 'test', result: Promise.resolve({}) } as never);

      const { result } = renderHook(() =>
        useStorageOperations({ identityId, currentPath })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.createFolder('new-folder');
      });

      expect(uploadData).toHaveBeenCalledWith({
        path: `media/${identityId}/new-folder/`,
        data: '',
      });
      // Initial fetch + refresh after create
      expect(list).toHaveBeenCalledTimes(2);
    });

    it('should handle nested path for folder creation', async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });
      vi.mocked(uploadData).mockResolvedValue({ path: 'test', result: Promise.resolve({}) } as never);

      const { result } = renderHook(() =>
        useStorageOperations({ identityId, currentPath: 'photos/travel' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.createFolder('japan');
      });

      expect(uploadData).toHaveBeenCalledWith({
        path: `media/${identityId}/photos/travel/japan/`,
        data: '',
      });
    });
  });

  describe('getFileUrl', () => {
    it('should return signed URL for file', async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });
      vi.mocked(getUrl).mockResolvedValue({
        url: new URL('https://s3.amazonaws.com/bucket/file.jpg?signed=xxx'),
        expiresAt: new Date(),
      });

      const { result } = renderHook(() =>
        useStorageOperations({ identityId, currentPath })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let url: string = '';
      await act(async () => {
        url = await result.current.getFileUrl('some/key/file.jpg');
      });

      expect(getUrl).toHaveBeenCalledWith({ path: 'some/key/file.jpg' });
      expect(url).toBe('https://s3.amazonaws.com/bucket/file.jpg?signed=xxx');
    });
  });

  describe('refresh', () => {
    it('should refetch items when called', async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });

      const { result } = renderHook(() =>
        useStorageOperations({ identityId, currentPath })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(list).toHaveBeenCalledTimes(1);

      await act(async () => {
        result.current.refresh();
      });

      expect(list).toHaveBeenCalledTimes(2);
    });
  });

  describe('basePath construction', () => {
    it('should construct correct basePath for root', async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });

      renderHook(() => useStorageOperations({ identityId, currentPath: '' }));

      await waitFor(() => {
        expect(list).toHaveBeenCalledWith({
          path: `media/${identityId}/`,
          options: { listAll: true },
        });
      });
    });

    it('should construct correct basePath for nested path', async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });

      renderHook(() =>
        useStorageOperations({ identityId, currentPath: 'photos/vacation' })
      );

      await waitFor(() => {
        expect(list).toHaveBeenCalledWith({
          path: `media/${identityId}/photos/vacation/`,
          options: { listAll: true },
        });
      });
    });
  });

  describe('removeItems (複数削除)', () => {
    it('should delete a single file', async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });
      vi.mocked(remove).mockResolvedValue({ path: 'test' });

      const { result } = renderHook(() =>
        useStorageOperations({ identityId, currentPath })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const items = [{ key: 'media/id/file.jpg', name: 'file.jpg', type: 'file' as const }];

      let deleteResult: { succeeded: string[]; failed: Array<{ key: string; error: Error }> };
      await act(async () => {
        deleteResult = await result.current.removeItems(items);
      });

      expect(remove).toHaveBeenCalledWith({ path: 'media/id/file.jpg' });
      expect(deleteResult!.succeeded).toEqual(['media/id/file.jpg']);
      expect(deleteResult!.failed).toHaveLength(0);
    });

    it('should delete multiple files in parallel', async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });
      vi.mocked(remove).mockResolvedValue({ path: 'test' });

      const { result } = renderHook(() =>
        useStorageOperations({ identityId, currentPath })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const items = [
        { key: 'media/id/file1.jpg', name: 'file1.jpg', type: 'file' as const },
        { key: 'media/id/file2.jpg', name: 'file2.jpg', type: 'file' as const },
        { key: 'media/id/file3.jpg', name: 'file3.jpg', type: 'file' as const },
      ];

      let deleteResult: { succeeded: string[]; failed: Array<{ key: string; error: Error }> };
      await act(async () => {
        deleteResult = await result.current.removeItems(items);
      });

      expect(remove).toHaveBeenCalledTimes(3);
      expect(deleteResult!.succeeded).toHaveLength(3);
      expect(deleteResult!.failed).toHaveLength(0);
    });

    it('should handle partial failure', async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });
      const mockError = new Error('Permission denied');
      vi.mocked(remove)
        .mockResolvedValueOnce({ path: 'test' })
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({ path: 'test' });

      const { result } = renderHook(() =>
        useStorageOperations({ identityId, currentPath })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const items = [
        { key: 'media/id/file1.jpg', name: 'file1.jpg', type: 'file' as const },
        { key: 'media/id/file2.jpg', name: 'file2.jpg', type: 'file' as const },
        { key: 'media/id/file3.jpg', name: 'file3.jpg', type: 'file' as const },
      ];

      let deleteResult: { succeeded: string[]; failed: Array<{ key: string; error: Error }> };
      await act(async () => {
        deleteResult = await result.current.removeItems(items);
      });

      expect(deleteResult!.succeeded).toHaveLength(2);
      expect(deleteResult!.failed).toHaveLength(1);
      expect(deleteResult!.failed[0].key).toBe('media/id/file2.jpg');
      expect(deleteResult!.failed[0].error).toBe(mockError);
    });

    it('should delete folder contents recursively', async () => {
      const basePath = `media/${identityId}/`;
      // Initial list for hook mount
      vi.mocked(list)
        .mockResolvedValueOnce({ items: [] })
        // Folder contents list
        .mockResolvedValueOnce({
          items: [
            { path: `${basePath}folder/file1.jpg`, size: 100 },
            { path: `${basePath}folder/file2.jpg`, size: 200 },
            { path: `${basePath}folder/subfolder/file3.jpg`, size: 300 },
          ],
        })
        // Final refresh
        .mockResolvedValueOnce({ items: [] });

      vi.mocked(remove).mockResolvedValue({ path: 'test' });

      const { result } = renderHook(() =>
        useStorageOperations({ identityId, currentPath })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const items = [{ key: `${basePath}folder/`, name: 'folder', type: 'folder' as const }];

      await act(async () => {
        await result.current.removeItems(items);
      });

      // Should list folder contents first
      expect(list).toHaveBeenCalledWith({
        path: `${basePath}folder/`,
        options: { listAll: true },
      });

      // Should delete all contents + folder itself (4 total: 3 files + 1 folder)
      expect(remove).toHaveBeenCalledTimes(4);
    });

    it('should handle folder that does not exist as object', async () => {
      const basePath = `media/${identityId}/`;
      // Initial list for hook mount
      vi.mocked(list)
        .mockResolvedValueOnce({ items: [] })
        // Folder contents list - no folder object, just files inside
        .mockResolvedValueOnce({
          items: [
            { path: `${basePath}folder/file1.jpg`, size: 100 },
          ],
        })
        // Final refresh
        .mockResolvedValueOnce({ items: [] });

      // First call succeeds (file), second call fails (folder object doesn't exist)
      vi.mocked(remove)
        .mockResolvedValueOnce({ path: 'test' })
        .mockRejectedValueOnce(new Error('NotFound'));

      const { result } = renderHook(() =>
        useStorageOperations({ identityId, currentPath })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const items = [{ key: `${basePath}folder/`, name: 'folder', type: 'folder' as const }];

      let deleteResult: { succeeded: string[]; failed: Array<{ key: string; error: Error }> };
      await act(async () => {
        deleteResult = await result.current.removeItems(items);
      });

      // File deletion succeeded, folder object deletion failed but that's ok
      expect(deleteResult!.succeeded).toContain(`${basePath}folder/file1.jpg`);
    });

    it('should set isDeleting to true during deletion', async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });
      let resolveRemove: () => void;
      vi.mocked(remove).mockImplementation(
        () => new Promise((resolve) => { resolveRemove = () => resolve({ path: 'test' }); })
      );

      const { result } = renderHook(() =>
        useStorageOperations({ identityId, currentPath })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isDeleting).toBe(false);

      const items = [{ key: 'media/id/file.jpg', name: 'file.jpg', type: 'file' as const }];

      let deletePromise: Promise<unknown>;
      act(() => {
        deletePromise = result.current.removeItems(items);
      });

      // isDeleting should be true while deletion is in progress
      expect(result.current.isDeleting).toBe(true);

      await act(async () => {
        resolveRemove!();
        await deletePromise;
      });

      expect(result.current.isDeleting).toBe(false);
    });

    it('should refresh items after deletion', async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });
      vi.mocked(remove).mockResolvedValue({ path: 'test' });

      const { result } = renderHook(() =>
        useStorageOperations({ identityId, currentPath })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(list).toHaveBeenCalledTimes(1);

      const items = [{ key: 'media/id/file.jpg', name: 'file.jpg', type: 'file' as const }];

      await act(async () => {
        await result.current.removeItems(items);
      });

      // Initial fetch + refresh after deletion
      expect(list).toHaveBeenCalledTimes(2);
    });
  });
});
