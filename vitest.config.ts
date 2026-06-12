import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["test/unit/**/*.test.{ts,tsx}"],
    globals: false,
    // jsdom + large rendered lists are CPU-heavy under parallel workers;
    // headroom over the 5s default prevents contention flakes.
    testTimeout: 15_000,
  },
});
