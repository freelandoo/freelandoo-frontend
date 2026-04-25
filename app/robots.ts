import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/search", "/maquina/*", "/*/*/*"],
      disallow: [
        "/account",
        "/account/*",
        "/admin",
        "/admin/*",
        "/login",
        "/cadastro",
        "/verify-email",
        "/api",
        "/api/*",
      ],
    },
    sitemap: "https://www.freelandoo.com.br/sitemap.xml",
  }
}
