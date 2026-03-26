import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(rootDir, "apps/web"),
  publicDir: path.resolve(rootDir, "apps/web/public"),
  plugins: [react()],
  resolve: {
    alias: {
      "@cet6/shared": path.resolve(rootDir, "packages/shared/src"),
      "@cet6/domain": path.resolve(rootDir, "packages/domain/src"),
      "@cet6/content": path.resolve(rootDir, "packages/content/src"),
      "@cet6/media": path.resolve(rootDir, "packages/media/src"),
      "@cet6/storage": path.resolve(rootDir, "packages/storage/src"),
      "@cet6/ui": path.resolve(rootDir, "packages/ui/src")
    }
  },
  server: {
    fs: {
      allow: [path.resolve(rootDir)]
    }
  },
  build: {
    outDir: path.resolve(rootDir, "dist"),
    emptyOutDir: true
  }
});
