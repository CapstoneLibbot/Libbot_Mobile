import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@/core": path.resolve(__dirname, "./src/core"),
      "@/features": path.resolve(__dirname, "./src/features"),
      "@/platform": path.resolve(__dirname, "./src/platform"),
      "@/shared": path.resolve(__dirname, "./src/shared"),
      "@/testing": path.resolve(__dirname, "./src/testing"),
    },
  },
  test: {
    include: [
      "src/**/__tests__/**/*.test.{ts,tsx}",
      "app/**/__tests__/**/*.test.{ts,tsx}",
    ],
    exclude: ["node_modules/**"],
  },
});

