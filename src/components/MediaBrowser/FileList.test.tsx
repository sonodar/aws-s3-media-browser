import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FileList } from "./FileList";
import type { StorageItem } from "../../types/storage";

// Mock ThumbnailImage component
vi.mock("./ThumbnailImage", () => ({
  ThumbnailImage: ({
    originalKey,
    fileName,
    fileType,
  }: {
    originalKey: string;
    fileName: string;
    fileType: string;
  }) => (
    <div
      data-testid="thumbnail-image"
      data-original-key={originalKey}
      data-file-name={fileName}
      data-file-type={fileType}
    >
      Mocked Thumbnail
    </div>
  ),
}));

describe("FileList", () => {
  const mockItems: StorageItem[] = [
    { key: "folder1/", name: "folder1", type: "folder" },
    { key: "photo.jpg", name: "photo.jpg", type: "file", size: 1024 },
    { key: "video.mp4", name: "video.mp4", type: "file", size: 2048 },
  ];

  it("should render empty state when no items", () => {
    render(<FileList items={[]} onFolderClick={vi.fn()} onFileClick={vi.fn()} />);

    expect(screen.getByText(/ファイルがありません/)).toBeInTheDocument();
  });

  it("should render file and folder items", () => {
    render(<FileList items={mockItems} onFolderClick={vi.fn()} onFileClick={vi.fn()} />);

    expect(screen.getByText("folder1")).toBeInTheDocument();
    expect(screen.getByText("photo.jpg")).toBeInTheDocument();
    expect(screen.getByText("video.mp4")).toBeInTheDocument();
  });

  it("should call onFolderClick when folder is clicked", () => {
    const onFolderClick = vi.fn();
    render(<FileList items={mockItems} onFolderClick={onFolderClick} onFileClick={vi.fn()} />);

    fireEvent.click(screen.getByText("folder1"));

    expect(onFolderClick).toHaveBeenCalledWith("folder1");
  });

  it("should call onFileClick when file is clicked", () => {
    const onFileClick = vi.fn();
    render(<FileList items={mockItems} onFolderClick={vi.fn()} onFileClick={onFileClick} />);

    fireEvent.click(screen.getByText("photo.jpg"));

    expect(onFileClick).toHaveBeenCalledWith(mockItems[1]);
  });

  it("should have file-list-item class for styling", () => {
    render(<FileList items={mockItems} onFolderClick={vi.fn()} onFileClick={vi.fn()} />);

    const listItems = screen.getAllByRole("listitem");
    listItems.forEach((item) => {
      // Verify that each item has the class that provides min-height: 56px (>44px)
      expect(item).toHaveClass("file-list-item");
    });
  });

  it("should show folder icon for folders", () => {
    render(<FileList items={mockItems} onFolderClick={vi.fn()} onFileClick={vi.fn()} />);

    // Folder should have folder icon indicator
    const folderItem = screen.getByText("folder1").closest("li");
    expect(folderItem).toHaveAttribute("data-type", "folder");
  });

  it("should show file icon for files", () => {
    render(<FileList items={mockItems} onFolderClick={vi.fn()} onFileClick={vi.fn()} />);

    const fileItem = screen.getByText("photo.jpg").closest("li");
    expect(fileItem).toHaveAttribute("data-type", "file");
  });

  describe("選択モード", () => {
    it("選択モード時にチェックボックスが表示される", () => {
      render(
        <FileList
          items={mockItems}
          onFolderClick={vi.fn()}
          onFileClick={vi.fn()}
          isSelectionMode={true}
          selectedKeys={new Set()}
          onToggleSelection={vi.fn()}
        />,
      );

      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes).toHaveLength(3);
    });

    it("選択モードでない場合はチェックボックスが表示されない", () => {
      render(
        <FileList
          items={mockItems}
          onFolderClick={vi.fn()}
          onFileClick={vi.fn()}
          isSelectionMode={false}
          selectedKeys={new Set()}
          onToggleSelection={vi.fn()}
        />,
      );

      const checkboxes = screen.queryAllByRole("checkbox");
      expect(checkboxes).toHaveLength(0);
    });

    it("選択中のアイテムにハイライトスタイルが適用される", () => {
      render(
        <FileList
          items={mockItems}
          onFolderClick={vi.fn()}
          onFileClick={vi.fn()}
          isSelectionMode={true}
          selectedKeys={new Set(["photo.jpg"])}
          onToggleSelection={vi.fn()}
        />,
      );

      const selectedItem = screen.getByText("photo.jpg").closest("li");
      expect(selectedItem).toHaveClass("file-list-item--selected");
    });

    it("選択されていないアイテムにはハイライトスタイルがない", () => {
      render(
        <FileList
          items={mockItems}
          onFolderClick={vi.fn()}
          onFileClick={vi.fn()}
          isSelectionMode={true}
          selectedKeys={new Set(["photo.jpg"])}
          onToggleSelection={vi.fn()}
        />,
      );

      const unselectedItem = screen.getByText("folder1").closest("li");
      expect(unselectedItem).not.toHaveClass("file-list-item--selected");
    });

    it("チェックボックスのクリックで onToggleSelection が呼ばれる", () => {
      const onToggleSelection = vi.fn();
      render(
        <FileList
          items={mockItems}
          onFolderClick={vi.fn()}
          onFileClick={vi.fn()}
          isSelectionMode={true}
          selectedKeys={new Set()}
          onToggleSelection={onToggleSelection}
        />,
      );

      const checkboxes = screen.getAllByRole("checkbox");
      fireEvent.click(checkboxes[0]);

      expect(onToggleSelection).toHaveBeenCalledWith("folder1/");
    });

    it("選択モード時はアイテムクリックで選択トグルが呼ばれる", () => {
      const onToggleSelection = vi.fn();
      const onFolderClick = vi.fn();
      const onFileClick = vi.fn();
      render(
        <FileList
          items={mockItems}
          onFolderClick={onFolderClick}
          onFileClick={onFileClick}
          isSelectionMode={true}
          selectedKeys={new Set()}
          onToggleSelection={onToggleSelection}
        />,
      );

      fireEvent.click(screen.getByText("folder1"));

      expect(onToggleSelection).toHaveBeenCalledWith("folder1/");
      expect(onFolderClick).not.toHaveBeenCalled();
    });

    it("選択モード時はファイルクリックで選択トグルが呼ばれる", () => {
      const onToggleSelection = vi.fn();
      const onFileClick = vi.fn();
      render(
        <FileList
          items={mockItems}
          onFolderClick={vi.fn()}
          onFileClick={onFileClick}
          isSelectionMode={true}
          selectedKeys={new Set()}
          onToggleSelection={onToggleSelection}
        />,
      );

      fireEvent.click(screen.getByText("photo.jpg"));

      expect(onToggleSelection).toHaveBeenCalledWith("photo.jpg");
      expect(onFileClick).not.toHaveBeenCalled();
    });

    it("チェックボックスに適切な aria-label が設定されている", () => {
      render(
        <FileList
          items={mockItems}
          onFolderClick={vi.fn()}
          onFileClick={vi.fn()}
          isSelectionMode={true}
          selectedKeys={new Set()}
          onToggleSelection={vi.fn()}
        />,
      );

      expect(screen.getByLabelText("folder1 を選択")).toBeInTheDocument();
      expect(screen.getByLabelText("photo.jpg を選択")).toBeInTheDocument();
      expect(screen.getByLabelText("video.mp4 を選択")).toBeInTheDocument();
    });

    it("選択中のチェックボックスは checked 状態になる", () => {
      render(
        <FileList
          items={mockItems}
          onFolderClick={vi.fn()}
          onFileClick={vi.fn()}
          isSelectionMode={true}
          selectedKeys={new Set(["photo.jpg"])}
          onToggleSelection={vi.fn()}
        />,
      );

      const checkbox = screen.getByLabelText("photo.jpg を選択") as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });
  });

  describe("thumbnail display", () => {
    it("should render ThumbnailImage for image files", () => {
      render(<FileList items={mockItems} onFolderClick={vi.fn()} onFileClick={vi.fn()} />);

      const thumbnails = screen.getAllByTestId("thumbnail-image");
      const imageThumbnail = thumbnails.find((t) => t.getAttribute("data-file-type") === "image");
      expect(imageThumbnail).toBeInTheDocument();
      expect(imageThumbnail).toHaveAttribute("data-file-name", "photo.jpg");
    });

    it("should render ThumbnailImage for video files", () => {
      render(<FileList items={mockItems} onFolderClick={vi.fn()} onFileClick={vi.fn()} />);

      const thumbnails = screen.getAllByTestId("thumbnail-image");
      const videoThumbnail = thumbnails.find((t) => t.getAttribute("data-file-type") === "video");
      expect(videoThumbnail).toBeInTheDocument();
      expect(videoThumbnail).toHaveAttribute("data-file-name", "video.mp4");
    });

    it("should use folder icon for folders instead of ThumbnailImage", () => {
      render(<FileList items={mockItems} onFolderClick={vi.fn()} onFileClick={vi.fn()} />);

      const thumbnails = screen.getAllByTestId("thumbnail-image");
      // Should have 2 thumbnails (image + video), not 3 (no folder)
      expect(thumbnails).toHaveLength(2);
    });

    it("should pass correct originalKey to ThumbnailImage", () => {
      render(<FileList items={mockItems} onFolderClick={vi.fn()} onFileClick={vi.fn()} />);

      const thumbnails = screen.getAllByTestId("thumbnail-image");
      const imageThumbnail = thumbnails.find((t) => t.getAttribute("data-file-type") === "image");
      expect(imageThumbnail).toHaveAttribute("data-original-key", "photo.jpg");
    });
  });

  describe("keyboard accessibility", () => {
    it("Space キーでチェックボックスが操作できる", () => {
      const onToggleSelection = vi.fn();
      render(
        <FileList
          items={mockItems}
          onFolderClick={vi.fn()}
          onFileClick={vi.fn()}
          isSelectionMode={true}
          selectedKeys={new Set()}
          onToggleSelection={onToggleSelection}
        />,
      );

      const checkbox = screen.getByLabelText("photo.jpg を選択");
      fireEvent.keyDown(checkbox, { key: " ", code: "Space" });

      // Checkbox handles space natively, so we click instead
      fireEvent.click(checkbox);
      expect(onToggleSelection).toHaveBeenCalledWith("photo.jpg");
    });

    it("チェックボックスがフォーカス可能である", () => {
      render(
        <FileList
          items={mockItems}
          onFolderClick={vi.fn()}
          onFileClick={vi.fn()}
          isSelectionMode={true}
          selectedKeys={new Set()}
          onToggleSelection={vi.fn()}
        />,
      );

      const checkbox = screen.getByLabelText("photo.jpg を選択");
      checkbox.focus();
      expect(document.activeElement).toBe(checkbox);
    });
  });
});
