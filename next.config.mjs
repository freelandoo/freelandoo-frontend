// F2.S1 — CSP em modo Report-Only: mapeia as fontes REAIS do app sem bloquear
// nada. Depois de ~1 semana sem violação legítima no console, vira
// Content-Security-Policy (enforce, F2.S2). Fontes mapeadas:
//   - backend Railway (fetch direto p/ upload grande + socket.io em /realtime)
//   - R2: pub-*.r2.dev (mídia pública) e *.r2.cloudflarestorage.com (PUT presigned)
//   - AdSense/GTM + Google OAuth (GIS) + Stripe (checkout hosted; form-action)
//   - MediaPipe (wasm via jsdelivr + modelo via storage.googleapis.com)
//   - `wss:` genérico no connect-src: LiveKit ainda sem domínio fixo em prod
//     (env LIVEKIT_URL não setada) — ESTREITAR para o host real antes do enforce.
//   - brapi/CoinGecko/AwesomeAPI NÃO entram: são chamados server-side.
const BACKEND_PUBLIC = "https://freelandoo-backend-production.up.railway.app"
const R2_PUBLIC = "https://pub-3b9774a0af714847979058ea5677a840.r2.dev"

const cspReportOnly = [
  "default-src 'self'",
  // 'unsafe-inline' por causa dos scripts inline do próprio Next (sem nonce) e
  // do bootstrap do Consent Mode; 'wasm-unsafe-eval' pro MediaPipe.
  // 'unsafe-eval' só em dev (source maps do next dev).
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""} https://pagead2.googlesyndication.com https://*.googlesyndication.com https://googleads.g.doubleclick.net https://www.googletagmanager.com https://accounts.google.com https://js.stripe.com https://*.adtrafficquality.google https://vercel.live`,
  "style-src 'self' 'unsafe-inline'",
  // img-src largo (https:) de propósito: criativos do AdSense vêm de dezenas
  // de CDNs imprevisíveis. data:/blob: pros previews de upload e canvas.
  "img-src 'self' data: blob: https:",
  `media-src 'self' blob: ${R2_PUBLIC} https://*.r2.dev`,
  "font-src 'self' data:",
  `connect-src 'self' ${BACKEND_PUBLIC} wss://freelandoo-backend-production.up.railway.app https://*.r2.cloudflarestorage.com ${R2_PUBLIC} https://*.r2.dev https://cdn.jsdelivr.net https://storage.googleapis.com https://accounts.google.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://googleads.g.doubleclick.net https://*.adtrafficquality.google wss:`,
  "worker-src 'self' blob:",
  `frame-src https://accounts.google.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com https://js.stripe.com https://vercel.live`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
  "frame-ancestors 'none'",
].join("; ")

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Ninguém embeda a Freelandoo em iframe (AdSense não exige o contrário).
  { key: "X-Frame-Options", value: "DENY" },
  // camera/microphone=(self): câmera in-browser (stories/bees/lives) roda no
  // próprio site; iframes de terceiros (ads) ficam sem acesso.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=()" },
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },
  // Tree-shaking de barris grandes: framer-motion (29 arquivos) e date-fns não
  // são otimizados por padrão (lucide-react/@radix já são, mas listados por
  // garantia). Corta JS de import desnecessário no bundle.
  experimental: {
    optimizePackageImports: [
      "framer-motion",
      "date-fns",
      "lucide-react",
    ],
  },
  // Remove console.* do output de produção (exceto error) — menos JS no cliente
  // e menos ruído/custo de log em serverless.
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2678400, // 31 dias — derivadas otimizadas mudam pouco
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.r2.dev",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "pub-3b9774a0af714847979058ea5677a840.r2.dev",
        pathname: "/**",
      },
    ],
  },
  async rewrites() {
    const backend =
      process.env.BACKEND_API_URL?.trim() ||
      "https://freelandoo-backend-production.up.railway.app"
    return {
      afterFiles: [
        { source: "/api/:path*", destination: `${backend.replace(/\/$/, "")}/:path*` },
      ],
    }
  },
}

export default nextConfig
