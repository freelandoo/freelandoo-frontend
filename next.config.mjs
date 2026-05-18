/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
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
