// Cada área privada aparece duas vezes: o caminho exato ($) e as subpáginas. Só o prefixo
// "/app" bloquearia também "/apple-icon.png".
import type { MetadataRoute } from "next";
import { PRIVATE_PREFIXES, siteOrigin } from "@/lib/site/origin";

export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE_PREFIXES.flatMap((p) => [`${p}$`, `${p}/`]) },
    sitemap: new URL("/sitemap.xml", origin).toString(),
  };
}
