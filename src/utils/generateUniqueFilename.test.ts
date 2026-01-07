import { describe, it, expect } from "vitest";
import { generateUniqueFilename } from "./generateUniqueFilename";

describe("generateUniqueFilename", () => {
  describe("重複なしの場合", () => {
    it("既存ファイルがない場合は元のファイル名をそのまま返す", () => {
      const result = generateUniqueFilename({
        originalName: "photo.jpg",
        existingNames: [],
      });

      expect(result.success).toBe(true);
      expect(result.filename).toBe("photo.jpg");
      expect(result.renamed).toBe(false);
    });

    it("重複しない場合は元のファイル名をそのまま返す", () => {
      const result = generateUniqueFilename({
        originalName: "photo.jpg",
        existingNames: ["other.jpg", "document.pdf"],
      });

      expect(result.success).toBe(true);
      expect(result.filename).toBe("photo.jpg");
      expect(result.renamed).toBe(false);
    });
  });

  describe("重複ありの場合", () => {
    it("重複がある場合は連番(1)付きファイル名を返す", () => {
      const result = generateUniqueFilename({
        originalName: "photo.jpg",
        existingNames: ["photo.jpg"],
      });

      expect(result.success).toBe(true);
      expect(result.filename).toBe("photo (1).jpg");
      expect(result.renamed).toBe(true);
    });

    it("連番(1)も存在する場合は連番(2)を返す", () => {
      const result = generateUniqueFilename({
        originalName: "photo.jpg",
        existingNames: ["photo.jpg", "photo (1).jpg"],
      });

      expect(result.success).toBe(true);
      expect(result.filename).toBe("photo (2).jpg");
      expect(result.renamed).toBe(true);
    });

    it("連番(1), (2), (3)も存在する場合は連番(4)を返す", () => {
      const result = generateUniqueFilename({
        originalName: "photo.jpg",
        existingNames: ["photo.jpg", "photo (1).jpg", "photo (2).jpg", "photo (3).jpg"],
      });

      expect(result.success).toBe(true);
      expect(result.filename).toBe("photo (4).jpg");
      expect(result.renamed).toBe(true);
    });

    it("連番に隙間がある場合は空いている番号を使用する", () => {
      const result = generateUniqueFilename({
        originalName: "photo.jpg",
        existingNames: ["photo.jpg", "photo (2).jpg", "photo (3).jpg"],
      });

      expect(result.success).toBe(true);
      expect(result.filename).toBe("photo (1).jpg");
      expect(result.renamed).toBe(true);
    });
  });

  describe("大文字小文字の区別", () => {
    it("大文字小文字を区別する（Photo.jpg と photo.jpg は別）", () => {
      const result = generateUniqueFilename({
        originalName: "photo.jpg",
        existingNames: ["Photo.jpg", "PHOTO.jpg"],
      });

      expect(result.success).toBe(true);
      expect(result.filename).toBe("photo.jpg");
      expect(result.renamed).toBe(false);
    });

    it("完全一致の場合のみ重複とみなす", () => {
      const result = generateUniqueFilename({
        originalName: "Photo.jpg",
        existingNames: ["Photo.jpg"],
      });

      expect(result.success).toBe(true);
      expect(result.filename).toBe("Photo (1).jpg");
      expect(result.renamed).toBe(true);
    });
  });

  describe("拡張子なしファイル", () => {
    it("拡張子がないファイルも正しく処理する", () => {
      const result = generateUniqueFilename({
        originalName: "README",
        existingNames: ["README"],
      });

      expect(result.success).toBe(true);
      expect(result.filename).toBe("README (1)");
      expect(result.renamed).toBe(true);
    });

    it("拡張子なしファイルで連番も存在する場合", () => {
      const result = generateUniqueFilename({
        originalName: "README",
        existingNames: ["README", "README (1)"],
      });

      expect(result.success).toBe(true);
      expect(result.filename).toBe("README (2)");
      expect(result.renamed).toBe(true);
    });
  });

  describe("複数ドット拡張子", () => {
    it(".tar.gz のような複数ドット拡張子を正しく処理する", () => {
      const result = generateUniqueFilename({
        originalName: "archive.tar.gz",
        existingNames: ["archive.tar.gz"],
      });

      expect(result.success).toBe(true);
      // 最後のドット以降を拡張子として扱う
      expect(result.filename).toBe("archive.tar (1).gz");
      expect(result.renamed).toBe(true);
    });
  });

  describe("長さ制限（100文字）", () => {
    it("生成されたファイル名が100文字以内なら成功する", () => {
      const longName = "a".repeat(90) + ".jpg"; // 94文字
      const result = generateUniqueFilename({
        originalName: longName,
        existingNames: [longName],
      });

      expect(result.success).toBe(true);
      expect(result.renamed).toBe(true);
      expect(result.filename!.length).toBeLessThanOrEqual(100);
    });

    it("連番付与後に100文字を超える場合はエラーを返す", () => {
      const longName = "a".repeat(96) + ".jpg"; // 100文字ちょうど
      const result = generateUniqueFilename({
        originalName: longName,
        existingNames: [longName],
      });

      // 連番を付けると100文字を超えるのでエラー
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.filename).toBeUndefined();
    });

    it("元のファイル名が100文字でも重複がなければ成功する", () => {
      const longName = "a".repeat(96) + ".jpg"; // 100文字ちょうど
      const result = generateUniqueFilename({
        originalName: longName,
        existingNames: [],
      });

      expect(result.success).toBe(true);
      expect(result.filename).toBe(longName);
      expect(result.renamed).toBe(false);
    });
  });

  describe("特殊なファイル名", () => {
    it("ファイル名にスペースがある場合も正しく処理する", () => {
      const result = generateUniqueFilename({
        originalName: "my photo.jpg",
        existingNames: ["my photo.jpg"],
      });

      expect(result.success).toBe(true);
      expect(result.filename).toBe("my photo (1).jpg");
      expect(result.renamed).toBe(true);
    });

    it("ファイル名に日本語がある場合も正しく処理する", () => {
      const result = generateUniqueFilename({
        originalName: "写真.jpg",
        existingNames: ["写真.jpg"],
      });

      expect(result.success).toBe(true);
      expect(result.filename).toBe("写真 (1).jpg");
      expect(result.renamed).toBe(true);
    });

    it("ドットで始まるファイル（隠しファイル）も正しく処理する", () => {
      const result = generateUniqueFilename({
        originalName: ".gitignore",
        existingNames: [".gitignore"],
      });

      expect(result.success).toBe(true);
      expect(result.filename).toBe(".gitignore (1)");
      expect(result.renamed).toBe(true);
    });
  });
});
