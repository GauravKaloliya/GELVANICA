import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname, "renderer"),
  base: "./",
  build: {
    outDir: path.resolve(__dirname, "dist/renderer"),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "renderer/index.html"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  publicDir: path.resolve(__dirname, "renderer/public"),
});
