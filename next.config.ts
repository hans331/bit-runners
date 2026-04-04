import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // Capacitor: 동적 라우트를 SPA처럼 처리
  trailingSlash: true,
};

export default nextConfig;
