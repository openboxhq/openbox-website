import type { APIRoute } from "astro";

// Builds /sitemap.xml from every page in src/pages, using the deployed site URL and base path.
const pages = import.meta.glob("./**/*.astro");

export const GET: APIRoute = ({ site }) => {
  const root = new URL(import.meta.env.BASE_URL.replace(/\/?$/, "/"), site);
  const urls = Object.keys(pages)
    .map((file) => file.replace(/^\.\//, "").replace(/\.astro$/, ""))
    .filter((route) => !route.split("/").some((part) => part.startsWith("_") || part.startsWith("[")) && route !== "404")
    .map((route) => (route === "index" ? "" : `${route.replace(/\/index$/, "")}/`))
    .sort()
    .map((path) => `  <url><loc>${new URL(path, root).href}</loc></url>`);

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
