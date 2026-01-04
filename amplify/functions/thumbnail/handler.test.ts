import { describe, it, expect } from 'vitest';
import { isImageFile, isVideoFile, getThumbnailPath, getFileExtension } from './utils';

describe('thumbnail handler utils', () => {
  describe('getFileExtension', () => {
    it('should extract file extension', () => {
      expect(getFileExtension('image.jpg')).toBe('jpg');
      expect(getFileExtension('video.mp4')).toBe('mp4');
      expect(getFileExtension('file.name.with.dots.png')).toBe('png');
    });

    it('should return empty string for files without extension', () => {
      expect(getFileExtension('noextension')).toBe('');
    });

    it('should be case insensitive', () => {
      expect(getFileExtension('IMAGE.JPG')).toBe('jpg');
      expect(getFileExtension('Video.MP4')).toBe('mp4');
    });
  });

  describe('isImageFile', () => {
    it('should return true for image files', () => {
      expect(isImageFile('photo.jpg')).toBe(true);
      expect(isImageFile('photo.jpeg')).toBe(true);
      expect(isImageFile('photo.png')).toBe(true);
      expect(isImageFile('photo.gif')).toBe(true);
      expect(isImageFile('photo.webp')).toBe(true);
    });

    it('should return false for non-image files', () => {
      expect(isImageFile('video.mp4')).toBe(false);
      expect(isImageFile('document.pdf')).toBe(false);
      expect(isImageFile('noextension')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isImageFile('photo.JPG')).toBe(true);
      expect(isImageFile('photo.PNG')).toBe(true);
    });
  });

  describe('isVideoFile', () => {
    it('should return true for video files', () => {
      expect(isVideoFile('video.mp4')).toBe(true);
      expect(isVideoFile('video.webm')).toBe(true);
      expect(isVideoFile('video.mov')).toBe(true);
    });

    it('should return false for non-video files', () => {
      expect(isVideoFile('photo.jpg')).toBe(false);
      expect(isVideoFile('document.pdf')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isVideoFile('video.MP4')).toBe(true);
      expect(isVideoFile('video.MOV')).toBe(true);
    });
  });

  describe('getThumbnailPath', () => {
    it('should convert media path to thumbnail path', () => {
      expect(getThumbnailPath('media/abc123/photos/image.jpg'))
        .toBe('thumbnails/abc123/photos/image.jpg.thumb.jpg');
    });

    it('should handle nested paths', () => {
      expect(getThumbnailPath('media/abc123/folder/subfolder/image.png'))
        .toBe('thumbnails/abc123/folder/subfolder/image.png.thumb.jpg');
    });

    it('should throw error for non-media paths', () => {
      expect(() => getThumbnailPath('other/path/image.jpg')).toThrow('Path must start with "media/"');
    });
  });
});
