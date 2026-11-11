// @ts-check
import { defineConfig } from "astro/config";

// GitHub Pages serves the site under /<repo>/; the deploy workflow sets these.
export default defineConfig({
  site: process.env.SITE_URL ?? "http://localhost:4321",
  base: process.env.SITE_BASE ?? "/",
  vite: {
    // Emit every script and asset as a file so the Content-Security-Policy can forbid inline scripts.
    build: { assetsInlineLimit: 0 },
  },
});
