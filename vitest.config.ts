import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Enable file parallelism - test files are now split and isolated
    fileParallelism: true,
    // Force module isolation to reset mocks between test files
    isolate: true,
    coverage: {
      provider: "v8",
      enabled: true,
      reporter: ["text", "html"],
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/test/**/*"],
    },
  },
});
