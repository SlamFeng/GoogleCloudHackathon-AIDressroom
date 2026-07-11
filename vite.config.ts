import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // PORT lets a second dev instance (e.g. an automated preview) pick its own
    // port without fighting the one already running on 5173.
    port: Number(process.env.PORT) || 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 4173
  }
});
