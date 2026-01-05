import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useStorage } from './useStorage';

// Mock Amplify Storage API
vi.mock('aws-amplify/storage', () => ({
  list: vi.fn(),
  getUrl: vi.fn(),
  remove: vi.fn(),
  uploadData: vi.fn(),
}));

// Mock fetchAuthSession
vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn(),
}));

import { list, remove, uploadData } from 'aws-amplify/storage';
import { fetchAuthSession } from 'aws-amplify/auth';

describe('useStorage', () => {
  const originalLocation = window.location;
  const originalHistory = window.history;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock identity ID
    vi.mocked(fetchAuthSession).mockResolvedValue({
      identityId: 'test-identity-id',
    } as Awaited<ReturnType<typeof fetchAuthSession>>);

    // Mock window.location and history for URL sync tests
    vi.stubGlobal('location', {
      ...originalLocation,
      href: 'http://localhost/',
      search: '',
    });
    vi.stubGlobal('history', {
      ...originalHistory,
      pushState: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('initial state', () => {
    it('should start with loading true', async () => {
      vi.mocked(list).mockResolvedValue({
        items: [],
        nextToken: undefined,
      } as Awaited<ReturnType<typeof list>>);

      const { result } = renderHook(() => useStorage());

      expect(result.current.loading).toBe(true);
    });

    it('should have empty items initially', async () => {
      vi.mocked(list).mockResolvedValue({
        items: [],
        nextToken: undefined,
      } as Awaited<ReturnType<typeof list>>);

      const { result } = renderHook(() => useStorage());

      expect(result.current.items).toEqual([]);
    });

    it('should have currentPath as empty string', async () => {
      vi.mocked(list).mockResolvedValue({
        items: [],
        nextToken: undefined,
      } as Awaited<ReturnType<typeof list>>);

      const { result } = renderHook(() => useStorage());

      expect(result.current.currentPath).toBe('');
    });
  });

  describe('list files', () => {
    it('should fetch files on mount', async () => {
      // @ts-expect-error - mock data structure differs from actual API type
      vi.mocked(list).mockResolvedValue({
        items: [
          { path: 'media/test-identity-id/photo.jpg', size: 1000, lastModified: new Date() },
        ],
        nextToken: undefined,
      });

      const { result } = renderHook(() => useStorage());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(list).toHaveBeenCalledWith({
        path: expect.stringContaining('media/'),
        options: { listAll: true },
      });
    });

    it('should parse files and folders correctly', async () => {
      // @ts-expect-error - mock data structure differs from actual API type
      vi.mocked(list).mockResolvedValue({
        items: [
          { path: 'media/test-identity-id/photo.jpg', size: 1000, lastModified: new Date() },
          { path: 'media/test-identity-id/folder1/', size: 0, lastModified: new Date() },
        ],
        nextToken: undefined,
      });

      const { result } = renderHook(() => useStorage());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.items).toHaveLength(2);
      // Folders are sorted first
      expect(result.current.items[0]).toMatchObject({
        name: 'folder1',
        type: 'folder',
      });
      expect(result.current.items[1]).toMatchObject({
        name: 'photo.jpg',
        type: 'file',
      });
    });
  });

  describe('navigate', () => {
    it('should navigate to folder and update currentPath', async () => {
      vi.mocked(list).mockResolvedValue({
        items: [],
        nextToken: undefined,
      } as Awaited<ReturnType<typeof list>>);

      const { result } = renderHook(() => useStorage());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.navigate('folder1');
      });

      await waitFor(() => {
        expect(result.current.currentPath).toBe('folder1');
      });
    });

    it('should go back to parent folder', async () => {
      vi.mocked(list).mockResolvedValue({
        items: [],
        nextToken: undefined,
      } as Awaited<ReturnType<typeof list>>);

      const { result } = renderHook(() => useStorage());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.navigate('folder1');
      });

      await waitFor(() => {
        expect(result.current.currentPath).toBe('folder1');
      });

      act(() => {
        result.current.goBack();
      });

      await waitFor(() => {
        expect(result.current.currentPath).toBe('');
      });
    });
  });

  describe('remove file', () => {
    it('should call remove API and refresh list', async () => {
      // @ts-expect-error - mock data structure differs from actual API type
      vi.mocked(list).mockResolvedValue({
        items: [
          { path: 'media/test-identity-id/photo.jpg', size: 1000, lastModified: new Date() },
        ],
        nextToken: undefined,
      });
      // @ts-expect-error - mock data structure differs from actual API type
      vi.mocked(remove).mockResolvedValue({
        path: 'media/test-identity-id/photo.jpg',
      });

      const { result } = renderHook(() => useStorage());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.remove('media/test-identity-id/photo.jpg');
      });

      expect(remove).toHaveBeenCalledWith({
        path: 'media/test-identity-id/photo.jpg',
      });
    });
  });

  describe('create folder', () => {
    it('should upload empty file with trailing slash', async () => {
      vi.mocked(list).mockResolvedValue({
        items: [],
        nextToken: undefined,
      } as Awaited<ReturnType<typeof list>>);
      // @ts-expect-error - mock data structure differs from actual API type
      vi.mocked(uploadData).mockReturnValue({
        result: Promise.resolve({ path: 'media/test-identity-id/newfolder/' }),
      });

      const { result } = renderHook(() => useStorage());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.createFolder('newfolder');
      });

      expect(uploadData).toHaveBeenCalledWith({
        path: expect.stringMatching(/media\/.*\/newfolder\//),
        data: '',
      });
    });
  });

  describe('error handling', () => {
    it('should set error on list failure', async () => {
      vi.mocked(list).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useStorage());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toBe('Network error');
    });
  });

  describe('URL synchronization', () => {
    it('should initialize currentPath from URL query parameter', async () => {
      vi.stubGlobal('location', {
        ...originalLocation,
        href: 'http://localhost/?path=photos%2F2024',
        search: '?path=photos%2F2024',
      });

      vi.mocked(list).mockResolvedValue({
        items: [],
        nextToken: undefined,
      } as Awaited<ReturnType<typeof list>>);

      const { result } = renderHook(() => useStorage());

      // Initial path should be parsed from URL
      expect(result.current.currentPath).toBe('photos/2024');
    });

    it('should update URL when navigating to folder', async () => {
      vi.mocked(list).mockResolvedValue({
        items: [],
        nextToken: undefined,
      } as Awaited<ReturnType<typeof list>>);

      const { result } = renderHook(() => useStorage());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.navigate('folder1');
      });

      await waitFor(() => {
        expect(result.current.currentPath).toBe('folder1');
      });

      expect(window.history.pushState).toHaveBeenCalledWith(
        { path: 'folder1' },
        '',
        expect.stringContaining('path=folder1')
      );
    });

    it('should update URL when going back', async () => {
      vi.stubGlobal('location', {
        ...originalLocation,
        href: 'http://localhost/?path=folder1',
        search: '?path=folder1',
      });

      vi.mocked(list).mockResolvedValue({
        items: [],
        nextToken: undefined,
      } as Awaited<ReturnType<typeof list>>);

      const { result } = renderHook(() => useStorage());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.goBack();
      });

      await waitFor(() => {
        expect(result.current.currentPath).toBe('');
      });

      // URL should be updated to remove path parameter
      expect(window.history.pushState).toHaveBeenCalledWith(
        { path: '' },
        '',
        expect.stringMatching(/^http:\/\/localhost\/(\?)?$/)
      );
    });

    it('should handle Japanese folder names in URL', async () => {
      const japanesePath = '写真/旅行';
      const encodedPath = encodeURIComponent(japanesePath);
      vi.stubGlobal('location', {
        ...originalLocation,
        href: `http://localhost/?path=${encodedPath}`,
        search: `?path=${encodedPath}`,
      });

      vi.mocked(list).mockResolvedValue({
        items: [],
        nextToken: undefined,
      } as Awaited<ReturnType<typeof list>>);

      const { result } = renderHook(() => useStorage());

      expect(result.current.currentPath).toBe(japanesePath);
    });

    it('should respond to popstate event (browser back/forward)', async () => {
      vi.mocked(list).mockResolvedValue({
        items: [],
        nextToken: undefined,
      } as Awaited<ReturnType<typeof list>>);

      const { result } = renderHook(() => useStorage());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Navigate to a folder first
      act(() => {
        result.current.navigate('folder1');
      });

      await waitFor(() => {
        expect(result.current.currentPath).toBe('folder1');
      });

      // Simulate popstate event (browser back button)
      vi.stubGlobal('location', {
        ...originalLocation,
        href: 'http://localhost/',
        search: '',
      });

      act(() => {
        window.dispatchEvent(new PopStateEvent('popstate', { state: { path: '' } }));
      });

      await waitFor(() => {
        expect(result.current.currentPath).toBe('');
      });
    });
  });

});
