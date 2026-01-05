/**
 * URL synchronization utilities for SPA router
 * Manages bidirectional sync between browser URL and current folder path
 */

export const PATH_PARAM = 'path';

/**
 * Parse the current folder path from URL query parameters
 * @returns Decoded folder path, or empty string on error/missing
 */
export function parseUrlPath(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    const path = params.get(PATH_PARAM);
    return path ?? '';
  } catch {
    // Parse error: fallback to root
    return '';
  }
}

/**
 * Sync the given folder path to the browser URL using History API
 * @param path - Current folder path (decoded)
 */
export function syncToUrl(path: string): void {
  const url = new URL(window.location.href);
  if (path) {
    url.searchParams.set(PATH_PARAM, path);
  } else {
    url.searchParams.delete(PATH_PARAM);
  }
  window.history.pushState({ path }, '', url.toString());
}
