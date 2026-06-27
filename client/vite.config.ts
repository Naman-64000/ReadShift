import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["readshift_fevicon.png", "pwa-192x192.png", "pwa-512x512.png"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Don't cache API calls — let NetworkFirst handle them
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "readshift-api-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // Ensure service worker is regenerated every build
        sourcemap: false,
      },
      manifest: {
        name: "ReadShift",
        short_name: "ReadShift",
        description: "Advanced Reading Comprehension Practice",
        theme_color: "#4f46e5",
        background_color: "#0f172a",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // ── Production build options ────────────────────────────────
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false, // no source maps in production
    // Raise the chunk-size warning threshold slightly (default 500 kB)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Content-hash every asset so CDN caches are never stale
        assetFileNames: "assets/[name].[hash].[ext]",
        chunkFileNames: "assets/[name].[hash].js",
        entryFileNames: "assets/[name].[hash].js",
        // Manual chunk splitting — keep vendor bundle separate
        manualChunks: {
          react: ["react", "react-dom"],
          router: ["react-router-dom"],
          supabase: ["@supabase/supabase-js"],
          zustand: ["zustand"],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});

