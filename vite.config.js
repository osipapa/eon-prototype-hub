import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// GitHub Pages project sites are served from /<repo>/.
// Set VITE_BASE to "/<your-repo>/" (default matches this repo name).
// Using HashRouter in the app means no 404.html is needed on refresh.
export default defineConfig({
  base: process.env.VITE_BASE || "/eon-prototype-hub/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Knowledge base code shared with the hub-mcp edge function.
      "@kb": path.resolve(__dirname, "./supabase/functions/hub-mcp/kb"),
    },
  },
});
