/**
 * Endereço público do site, usado nas imagens de compartilhamento, no endereço canônico, no
 * robots.txt e no sitemap. Na Vercel vem do domínio de produção informado no build (acompanha o
 * domínio próprio quando ele for o principal); fora dela, da URL do site, ignorando localhost,
 * que não serve para quem recebe o link.
 */
export function siteOrigin(): URL {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return new URL(`https://${vercel}`);
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site && !/localhost|127\.0\.0\.1/.test(site)) return new URL(site);
  return new URL("https://metodolr.vercel.app");
}

/** Páginas abertas ao público, na ordem do sitemap. As áreas logadas ficam fora da busca. */
export const PUBLIC_PAGES = ["/", "/planos", "/solicitar-acesso", "/login", "/privacidade", "/termos"] as const;

// A administração fica de fora de propósito: listá-la no robots.txt anunciaria que ela existe.
// Para quem não é administrador, /admin responde 404 (src/proxy.ts).
export const PRIVATE_PREFIXES = ["/app", "/aluno", "/conta", "/auth", "/aguardando-aprovacao", "/demo"] as const;
