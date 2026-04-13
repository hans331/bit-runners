import type { NextConfig } from "next";

const isCapacitor = process.env.BUILD_TARGET === 'capacitor';

const nextConfig: NextConfig = {
  // Capacitor 빌드 시에만 정적 export
  ...(isCapacitor ? { output: "export" } : {}),
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
