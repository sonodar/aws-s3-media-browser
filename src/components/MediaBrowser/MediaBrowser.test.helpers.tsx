import type { ReactNode } from "react";
import { vi } from "vitest";
import { list, remove, uploadData } from "aws-amplify/storage";
import { fetchAuthSession } from "aws-amplify/auth";
import { MantineProvider } from "@mantine/core";
import { TestProvider } from "../../stores";

// Test fixtures
export const mockIdentityId = "test-identity-id";

export const mockRootItems = [
  {
    key: `media/${mockIdentityId}/photo1.jpg`,
    path: `media/${mockIdentityId}/photo1.jpg`,
    size: 1024,
    lastModified: new Date("2024-01-01"),
  },
  {
    key: `media/${mockIdentityId}/folder1/`,
    path: `media/${mockIdentityId}/folder1/`,
    size: 0,
    lastModified: new Date("2024-01-01"),
  },
  {
    key: `media/${mockIdentityId}/video1.mp4`,
    path: `media/${mockIdentityId}/video1.mp4`,
    size: 2048,
    lastModified: new Date("2024-01-02"),
  },
];

export const mockFolder1Items = [
  {
    key: `media/${mockIdentityId}/folder1/nested-photo.jpg`,
    path: `media/${mockIdentityId}/folder1/nested-photo.jpg`,
    size: 512,
    lastModified: new Date("2024-01-03"),
  },
  {
    key: `media/${mockIdentityId}/folder1/subfolder/`,
    path: `media/${mockIdentityId}/folder1/subfolder/`,
    size: 0,
    lastModified: new Date("2024-01-03"),
  },
];

// Sort test items with varied dates and sizes
export const sortTestItems = [
  {
    key: `media/${mockIdentityId}/folder1/`,
    path: `media/${mockIdentityId}/folder1/`,
    size: 0,
    lastModified: new Date("2024-01-02"),
  },
  {
    key: `media/${mockIdentityId}/folder2/`,
    path: `media/${mockIdentityId}/folder2/`,
    size: 0,
    lastModified: new Date("2024-01-01"),
  },
  {
    key: `media/${mockIdentityId}/a-file.jpg`,
    path: `media/${mockIdentityId}/a-file.jpg`,
    size: 500,
    lastModified: new Date("2024-01-01"),
  },
  {
    key: `media/${mockIdentityId}/z-file.jpg`,
    path: `media/${mockIdentityId}/z-file.jpg`,
    size: 2000,
    lastModified: new Date("2024-01-03"),
  },
  {
    key: `media/${mockIdentityId}/m-file.jpg`,
    path: `media/${mockIdentityId}/m-file.jpg`,
    size: 1000,
    lastModified: new Date("2024-01-02"),
  },
];

export const SORT_ORDER_STORAGE_KEY = "s3-photo-browser:sort-order";

// Setup function for common test configuration
export function setupMediaBrowserTest() {
  const originalLocation = window.location;
  const originalHistory = window.history;
  const originalOnUnhandledRejection = window.onunhandledrejection;

  return {
    originalLocation,
    originalHistory,
    originalOnUnhandledRejection,
    setupBeforeEach: () => {
      vi.clearAllMocks();
      localStorage.removeItem(SORT_ORDER_STORAGE_KEY);

      // Suppress unhandled rejection for expected errors in tests
      window.onunhandledrejection = (event) => {
        if (event.reason?.message === "Auth failed") {
          event.preventDefault();
        }
      };

      // Mock auth session
      vi.mocked(fetchAuthSession).mockResolvedValue({
        identityId: mockIdentityId,
      } as Awaited<ReturnType<typeof fetchAuthSession>>);

      // Mock window.location and history
      vi.stubGlobal("location", {
        ...originalLocation,
        href: "http://localhost/",
        search: "",
      });
      vi.stubGlobal("history", {
        ...originalHistory,
        pushState: vi.fn(),
      });

      // Default mock for list - returns root items
      vi.mocked(list).mockResolvedValue({
        items: mockRootItems,
      });

      vi.mocked(remove).mockResolvedValue({
        key: "",
      });

      vi.mocked(uploadData).mockReturnValue({
        result: Promise.resolve({ key: "" }),
      } as ReturnType<typeof uploadData>);
    },
    cleanupAfterEach: () => {
      vi.unstubAllGlobals();
      window.onunhandledrejection = originalOnUnhandledRejection;
    },
  };
}

/**
 * Test wrapper that provides Jotai context
 */
export function MediaBrowserTestWrapper({ children }: { children: ReactNode }) {
  return (
    <MantineProvider>
      <TestProvider>{children}</TestProvider>
    </MantineProvider>
  );
}

// Re-export mocked modules for use in tests
export { list, remove, uploadData, fetchAuthSession };
