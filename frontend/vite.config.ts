import { defineConfig } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Módulos dentro de node_modules/<paquete>/ (ids de Vite siempre con "/", también con pnpm).
const pkgs = (...names: string[]) => new RegExp(`/node_modules/(${names.join("|")})/`);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "terser",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        // Rolldown (Vite 8) no admite manualChunks en forma de objeto: mismos grupos por paquete.
        codeSplitting: {
          groups: [
            // Split vendor code
            { name: "vendor", test: pkgs("react", "react-dom", "react-router-dom", "react-redux", "@reduxjs/toolkit") },
            // Split UI libraries
            { name: "ui", test: pkgs("@radix-ui/[^/]+") },
            // Split i18n
            { name: "i18n", test: pkgs("i18next", "react-i18next", "i18next-browser-languagedetector", "i18next-http-backend") },
            // Split icons
            { name: "icons", test: pkgs("lucide-react", "react-icons") },
          ],
        },
        // Ensure chunks are properly named and don't exceed size limit
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
  server: {
    // Improve HMR performance
    hmr: {
      overlay: true,
    },
    // Optimize memory usage
    fs: {
      strict: true,
    },
  },
});
