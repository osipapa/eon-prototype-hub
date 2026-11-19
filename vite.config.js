import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// GitHub Pages project sites are served from /<repo>/.
// Set VITE_BASE to "/<your-repo>/" (default matches this repo name).
// Using HashRouter in the app means no 404.html is needed on refresh.
export default defineConfig({
  base: process.env.VITE_BASE || "/eon-prototype-hub/",
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // React and Supabase change far less often than the app, so they get
        // their own files: a deploy leaves them cached for returning visitors.
        manualChunks(id) {
          if (/node_modules\/(@supabase\/|iceberg-js\/)/.test(id)) return "supabase";
          if (/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|@remix-run\/router)\//.test(id)) return "react";
          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Knowledge base code shared with the hub-mcp edge function.
      "@kb": path.resolve(__dirname, "./supabase/functions/hub-mcp/kb"),
    },
  },
});
