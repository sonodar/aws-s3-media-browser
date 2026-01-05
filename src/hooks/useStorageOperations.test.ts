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
});
