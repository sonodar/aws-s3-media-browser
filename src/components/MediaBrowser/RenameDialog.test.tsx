import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { RenameDialog } from './RenameDialog';
import type { StorageItem } from '../../types/storage';
import type { RenameItemResult, RenameFolderResult, RenameProgress } from '../../hooks/useStorageOperations';

describe('RenameDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnRenameFile = vi.fn<[string, string], Promise<RenameItemResult>>();
  const mockOnRenameFolder = vi.fn<
    [string, string, ((progress: RenameProgress) => void)?],
    Promise<RenameFolderResult>
  >();

  const fileItem: StorageItem = {
    key: 'media/user123/photos/image.jpg',
    name: 'image.jpg',
    type: 'file',
  };

  const folderItem: StorageItem = {
    key: 'media/user123/photos/myfolder/',
    name: 'myfolder',
    type: 'folder',
  };

  const existingItems: StorageItem[] = [
    fileItem,
    folderItem,
    { key: 'media/user123/photos/existing.jpg', name: 'existing.jpg', type: 'file' },
    { key: 'media/user123/photos/existingfolder/', name: 'existingfolder', type: 'folder' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnRenameFile.mockResolvedValue({ success: true });
    mockOnRenameFolder.mockResolvedValue({ success: true, succeeded: 5, failed: 0 });
  });

  describe('initial display', () => {
    it('should not render when isOpen is false', () => {
      render(
        <RenameDialog
          isOpen={false}
          item={fileItem}
          existingItems={existingItems}
          onClose={mockOnClose}
          onRenameFile={mockOnRenameFile}
          onRenameFolder={mockOnRenameFolder}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render dialog with file title when item is file', () => {
      render(
        <RenameDialog
          isOpen={true}
          item={fileItem}
          existingItems={existingItems}
          onClose={mockOnClose}
          onRenameFile={mockOnRenameFile}
          onRenameFolder={mockOnRenameFolder}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('ファイル名を変更')).toBeInTheDocument();
    });

    it('should render dialog with folder title when item is folder', () => {
      render(
        <RenameDialog
          isOpen={true}
          item={folderItem}
          existingItems={existingItems}
          onClose={mockOnClose}
          onRenameFile={mockOnRenameFile}
          onRenameFolder={mockOnRenameFolder}
        />
      );

      expect(screen.getByText('フォルダ名を変更')).toBeInTheDocument();
    });

    it('should have current name as default value in input field', () => {
      render(
        <RenameDialog
          isOpen={true}
          item={fileItem}
          existingItems={existingItems}
          onClose={mockOnClose}
          onRenameFile={mockOnRenameFile}
          onRenameFolder={mockOnRenameFolder}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('image.jpg');
    });

    it('should have autofocus on input field', () => {
      render(
        <RenameDialog
          isOpen={true}
          item={fileItem}
          existingItems={existingItems}
          onClose={mockOnClose}
          onRenameFile={mockOnRenameFile}
          onRenameFolder={mockOnRenameFolder}
        />
      );

      const input = screen.getByRole('textbox');
      expect(document.activeElement).toBe(input);
    });
  });

  describe('validation error display', () => {
    it('should show error for empty name', async () => {
      render(
        <RenameDialog
          isOpen={true}
          item={fileItem}
          existingItems={existingItems}
          onClose={mockOnClose}
          onRenameFile={mockOnRenameFile}
          onRenameFolder={mockOnRenameFolder}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.click(screen.getByRole('button', { name: '変更' }));

      expect(screen.getByText('名前を入力してください')).toBeInTheDocument();
      expect(mockOnRenameFile).not.toHaveBeenCalled();
    });

    it('should show error for name with slash', async () => {
      render(
        <RenameDialog
          isOpen={true}
          item={fileItem}
          existingItems={existingItems}
          onClose={mockOnClose}
          onRenameFile={mockOnRenameFile}
          onRenameFolder={mockOnRenameFolder}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'foo/bar' } });
      fireEvent.click(screen.getByRole('button', { name: '変更' }));

      expect(screen.getByText('名前にスラッシュは使用できません')).toBeInTheDocument();
    });

    it('should show error for unchanged name', async () => {
      render(
        <RenameDialog
          isOpen={true}
          item={fileItem}
          existingItems={existingItems}
          onClose={mockOnClose}
          onRenameFile={mockOnRenameFile}
          onRenameFolder={mockOnRenameFolder}
        />
      );

      // Name is already set to item.name, just click submit
      fireEvent.click(screen.getByRole('button', { name: '変更' }));

      expect(screen.getByText('名前が変更されていません')).toBeInTheDocument();
    });

    it('should show error for duplicate file name', async () => {
      render(
        <RenameDialog
          isOpen={true}
          item={fileItem}
          existingItems={existingItems}
          onClose={mockOnClose}
          onRenameFile={mockOnRenameFile}
          onRenameFolder={mockOnRenameFolder}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'existing.jpg' } });
      fireEvent.click(screen.getByRole('button', { name: '変更' }));

      expect(screen.getByText('同じ名前のファイルが既に存在します')).toBeInTheDocument();
    });
  });

  describe('keyboard handling', () => {
    it('should not submit on Enter keyDown (removed for IME compatibility)', async () => {
      // モバイルファーストのため、また IME との相性が悪いため Enter キーでのリネーム実行を削除
      render(
        <RenameDialog
          isOpen={true}
          item={fileItem}
          existingItems={existingItems}
          onClose={mockOnClose}
          onRenameFile={mockOnRenameFile}
          onRenameFolder={mockOnRenameFolder}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'newname.jpg' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // Enter keyDown では submit が呼ばれないことを確認
      expect(mockOnRenameFile).not.toHaveBeenCalled();
    });

    it('should close on Escape key', () => {
      render(
        <RenameDialog
          isOpen={true}
          item={fileItem}
          existingItems={existingItems}
          onClose={mockOnClose}
          onRenameFile={mockOnRenameFile}
          onRenameFolder={mockOnRenameFolder}
        />
      );

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('button interactions', () => {
    it('should close dialog on cancel button click', () => {
      render(
        <RenameDialog
          isOpen={true}
          item={fileItem}
          existingItems={existingItems}
          onClose={mockOnClose}
          onRenameFile={mockOnRenameFile}
          onRenameFolder={mockOnRenameFolder}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onRenameFile for file item on submit', async () => {
      render(
        <RenameDialog
          isOpen={true}
          item={fileItem}
          existingItems={existingItems}
          onClose={mockOnClose}
          onRenameFile={mockOnRenameFile}
          onRenameFolder={mockOnRenameFolder}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'newfile.jpg' } });
      fireEvent.click(screen.getByRole('button', { name: '変更' }));

      await waitFor(() => {
        expect(mockOnRenameFile).toHaveBeenCalledWith(fileItem.key, 'newfile.jpg');
      });
    });

    it('should call onRenameFolder for folder item on submit', async () => {
      render(
        <RenameDialog
          isOpen={true}
          item={folderItem}
          existingItems={existingItems}
          onClose={mockOnClose}
          onRenameFile={mockOnRenameFile}
          onRenameFolder={mockOnRenameFolder}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'newfolder' } });
      fireEvent.click(screen.getByRole('button', { name: '変更' }));

      await waitFor(() => {
        expect(mockOnRenameFolder).toHaveBeenCalledWith(
          folderItem.key,
          'newfolder',
          expect.any(Function)
        );
      });
    });
  });

  describe('processing state', () => {
    it('should disable input and buttons during processing', async () => {
      // Make rename take some time
      let resolveRename: (value: RenameItemResult) => void;
      const renamePromise = new Promise<RenameItemResult>((resolve) => {
        resolveRename = resolve;
      });
      mockOnRenameFile.mockReturnValueOnce(renamePromise);

      render(
        <RenameDialog
          isOpen={true}
          item={fileItem}
          existingItems={existingItems}
          onClose={mockOnClose}
          onRenameFile={mockOnRenameFile}
          onRenameFolder={mockOnRenameFolder}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'newfile.jpg' } });
      fireEvent.click(screen.getByRole('button', { name: '変更' }));

      // Should be disabled during processing
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeDisabled();
      });
      expect(screen.getByRole('button', { name: 'キャンセル' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '変更中...' })).toBeDisabled();

      // Resolve to complete
      await act(async () => {
        resolveRename!({ success: true });
      });
    });

    it('should show processing text on submit button', async () => {
      let resolveRename: (value: RenameItemResult) => void;
      const renamePromise = new Promise<RenameItemResult>((resolve) => {
        resolveRename = resolve;
      });
      mockOnRenameFile.mockReturnValueOnce(renamePromise);

      render(
        <RenameDialog
          isOpen={true}
          item={fileItem}
          existingItems={existingItems}
          onClose={mockOnClose}
          onRenameFile={mockOnRenameFile}
          onRenameFolder={mockOnRenameFolder}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'newfile.jpg' } });
      fireEvent.click(screen.getByRole('button', { name: '変更' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '変更中...' })).toBeInTheDocument();
      });

      await act(async () => {
        resolveRename!({ success: true });
      });
    });
  });

  describe('folder rename progress', () => {
    it('should display progress during folder rename', async () => {
      let progressCallback: ((progress: RenameProgress) => void) | undefined;
      let resolveRename: (value: RenameFolderResult) => void;
      const renamePromise = new Promise<RenameFolderResult>((resolve) => {
        resolveRename = resolve;
      });

      mockOnRenameFolder.mockImplementationOnce((_key, _name, onProgress) => {
        progressCallback = onProgress;
        return renamePromise;
      });

      render(
        <RenameDialog
          isOpen={true}
          item={folderItem}
          existingItems={existingItems}
          onClose={mockOnClose}
          onRenameFile={mockOnRenameFile}
          onRenameFolder={mockOnRenameFolder}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'newfolder' } });
      fireEvent.click(screen.getByRole('button', { name: '変更' }));

      // Wait for rename to start
      await waitFor(() => {
        expect(mockOnRenameFolder).toHaveBeenCalled();
      });

      // Simulate progress
      act(() => {
        progressCallback?.({ current: 3, total: 10 });
      });

      await waitFor(() => {
        expect(screen.getByText('3 / 10 件処理中...')).toBeInTheDocument();
      });

      await act(async () => {
        resolveRename!({ success: true, succeeded: 10, failed: 0 });
      });
    });
  });

  describe('error handling from hook', () => {
    it('should display error from onRenameFile', async () => {
      mockOnRenameFile.mockResolvedValueOnce({
        success: false,
        error: '同じ名前のファイルが既に存在します',
      });

      render(
        <RenameDialog
          isOpen={true}
          item={fileItem}
          existingItems={existingItems}
          onClose={mockOnClose}
          onRenameFile={mockOnRenameFile}
          onRenameFolder={mockOnRenameFolder}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'newfile.jpg' } });
      fireEvent.click(screen.getByRole('button', { name: '変更' }));

      await waitFor(() => {
        expect(screen.getByText('同じ名前のファイルが既に存在します')).toBeInTheDocument();
      });

      // Dialog should remain open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should display error from onRenameFolder', async () => {
      mockOnRenameFolder.mockResolvedValueOnce({
        success: false,
        error: '重複するファイルが存在します（3件）',
        duplicates: ['file1.txt', 'file2.txt', 'file3.txt'],
      });

      render(
        <RenameDialog
          isOpen={true}
          item={folderItem}
          existingItems={existingItems}
          onClose={mockOnClose}
          onRenameFile={mockOnRenameFile}
          onRenameFolder={mockOnRenameFolder}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'newfolder' } });
      fireEvent.click(screen.getByRole('button', { name: '変更' }));

      await waitFor(() => {
        expect(screen.getByText('重複するファイルが存在します（3件）')).toBeInTheDocument();
      });
    });

    it('should display partial failure details for folder rename', async () => {
      mockOnRenameFolder.mockResolvedValueOnce({
        success: false,
        succeeded: 7,
        failed: 3,
        failedFiles: ['subdir/file1.txt', 'subdir/file2.txt', 'file3.jpg'],
      });

      render(
        <RenameDialog
          isOpen={true}
          item={folderItem}
          existingItems={existingItems}
          onClose={mockOnClose}
          onRenameFile={mockOnRenameFile}
          onRenameFolder={mockOnRenameFolder}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'newfolder' } });
      fireEvent.click(screen.getByRole('button', { name: '変更' }));

      // Should show summary
      await waitFor(() => {
        expect(screen.getByText(/成功: 7件/)).toBeInTheDocument();
        expect(screen.getByText(/失敗: 3件/)).toBeInTheDocument();
      });

      // Should show failed files list
      expect(screen.getByText('subdir/file1.txt')).toBeInTheDocument();
      expect(screen.getByText('subdir/file2.txt')).toBeInTheDocument();
      expect(screen.getByText('file3.jpg')).toBeInTheDocument();
    });

    it('should display duplicate files list when folder rename has duplicates', async () => {
      mockOnRenameFolder.mockResolvedValueOnce({
        success: false,
        error: '重複するファイルが存在します（2件）',
        duplicates: ['duplicate1.txt', 'duplicate2.txt'],
      });

      render(
        <RenameDialog
          isOpen={true}
          item={folderItem}
          existingItems={existingItems}
          onClose={mockOnClose}
          onRenameFile={mockOnRenameFile}
          onRenameFolder={mockOnRenameFolder}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'newfolder' } });
      fireEvent.click(screen.getByRole('button', { name: '変更' }));

      await waitFor(() => {
        expect(screen.getByText('duplicate1.txt')).toBeInTheDocument();
        expect(screen.getByText('duplicate2.txt')).toBeInTheDocument();
      });
    });

    it('should close dialog on success with warning from onRenameFile', async () => {
      mockOnRenameFile.mockResolvedValueOnce({
        success: true,
        warning: '元ファイルの削除に失敗しました',
      });

      render(
        <RenameDialog
          isOpen={true}
          item={fileItem}
          existingItems={existingItems}
          onClose={mockOnClose}
          onRenameFile={mockOnRenameFile}
          onRenameFolder={mockOnRenameFolder}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'newfile.jpg' } });
      fireEvent.click(screen.getByRole('button', { name: '変更' }));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('success handling', () => {
    it('should close dialog on successful file rename', async () => {
      render(
        <RenameDialog
          isOpen={true}
          item={fileItem}
          existingItems={existingItems}
          onClose={mockOnClose}
          onRenameFile={mockOnRenameFile}
          onRenameFolder={mockOnRenameFolder}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'newfile.jpg' } });
      fireEvent.click(screen.getByRole('button', { name: '変更' }));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should close dialog on successful folder rename', async () => {
      render(
        <RenameDialog
          isOpen={true}
          item={folderItem}
          existingItems={existingItems}
          onClose={mockOnClose}
          onRenameFile={mockOnRenameFile}
          onRenameFolder={mockOnRenameFolder}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'newfolder' } });
      fireEvent.click(screen.getByRole('button', { name: '変更' }));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });
});
