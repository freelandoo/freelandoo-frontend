import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/account",
        "/account/*",
        "/admin",
        "/admin/*",
        "/login",
        "/cadastro",
        "/verify-email",
        "/forgot-password",
        "/reset-password",
        "/confirmar-email",
        "/activate",
        "/api",
        "/api/*",
      ],
    },
    sitemap: "https://www.freelandoo.com.br/sitemap.xml",
  }
}
