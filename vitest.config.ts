import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    maxWorkers: 1,
    include: ["app/**/*.test.ts", "app/**/*.test.tsx"],
    setupFiles: ["./app/test-setup.ts"],
  },
});
