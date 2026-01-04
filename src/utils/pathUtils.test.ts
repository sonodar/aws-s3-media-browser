import { describe, it, expect } from 'vitest';
import {
  getThumbnailPath,
  getOriginalPath,
  isThumbnailTarget,
} from './pathUtils';

describe('pathUtils', () => {
  describe('getThumbnailPath', () => {
    it('should convert media path to thumbnails path', () => {
      expect(getThumbnailPath('media/abc123/photos/image.jpg')).toBe(
        'thumbnails/abc123/photos/image.jpg.thumb.jpg'
      );
    });

    it('should handle nested directories', () => {
      expect(getThumbnailPath('media/abc123/2024/01/photo.png')).toBe(
        'thumbnails/abc123/2024/01/photo.png.thumb.jpg'
      );
    });

    it('should handle video files', () => {
      expect(getThumbnailPath('media/abc123/videos/video.mp4')).toBe(
        'thumbnails/abc123/videos/video.mp4.thumb.jpg'
      );
    });

    it('should handle files with multiple dots', () => {
      expect(getThumbnailPath('media/abc123/photo.backup.jpg')).toBe(
        'thumbnails/abc123/photo.backup.jpg.thumb.jpg'
      );
    });

    it('should throw error for non-media path', () => {
      expect(() => getThumbnailPath('other/abc123/image.jpg')).toThrow(
        'Path must start with "media/"'
      );
    });
  });

  describe('getOriginalPath', () => {
    it('should convert thumbnails path back to media path', () => {
      expect(getOriginalPath('thumbnails/abc123/photos/image.jpg.thumb.jpg')).toBe(
        'media/abc123/photos/image.jpg'
      );
    });

    it('should handle nested directories', () => {
      expect(getOriginalPath('thumbnails/abc123/2024/01/photo.png.thumb.jpg')).toBe(
        'media/abc123/2024/01/photo.png'
      );
    });

    it('should handle video thumbnails', () => {
      expect(getOriginalPath('thumbnails/abc123/videos/video.mp4.thumb.jpg')).toBe(
        'media/abc123/videos/video.mp4'
      );
    });

    it('should throw error for non-thumbnails path', () => {
      expect(() => getOriginalPath('media/abc123/image.jpg')).toThrow(
        'Path must start with "thumbnails/"'
      );
    });

    it('should throw error for path without .thumb.jpg suffix', () => {
      expect(() => getOriginalPath('thumbnails/abc123/image.jpg')).toThrow(
        'Path must end with ".thumb.jpg"'
      );
    });
  });

  describe('isThumbnailTarget', () => {
    describe('image files', () => {
      it.each(['jpg', 'jpeg', 'png', 'gif', 'webp'])(
        'should return true for .%s files',
        (ext) => {
          expect(isThumbnailTarget(`photo.${ext}`)).toBe(true);
        }
      );

      it('should be case-insensitive', () => {
        expect(isThumbnailTarget('photo.JPG')).toBe(true);
        expect(isThumbnailTarget('photo.PNG')).toBe(true);
      });
    });

    describe('video files', () => {
      it.each(['mp4', 'webm', 'mov'])(
        'should return true for .%s files',
        (ext) => {
          expect(isThumbnailTarget(`video.${ext}`)).toBe(true);
        }
      );
    });

    describe('non-target files', () => {
      it('should return false for PDF files', () => {
        expect(isThumbnailTarget('document.pdf')).toBe(false);
      });

      it('should return false for text files', () => {
        expect(isThumbnailTarget('readme.txt')).toBe(false);
      });

      it('should return false for files without extension', () => {
        expect(isThumbnailTarget('README')).toBe(false);
      });
    });
  });
});
