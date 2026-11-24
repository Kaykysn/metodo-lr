import type { MetadataRoute } from "next";
import { PUBLIC_PAGES, siteOrigin } from "@/lib/site/origin";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  return PUBLIC_PAGES.map((path) => ({
    url: new URL(path, origin).toString(),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/planos" ? 0.8 : 0.5,
  }));
}
