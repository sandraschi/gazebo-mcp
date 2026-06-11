import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 10990,
    proxy: {
      "/api": "http://127.0.0.1:10991",
      "/health": "http://127.0.0.1:10991",
    },
  },
  build: { outDir: "dist" },
});
