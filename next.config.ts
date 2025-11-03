import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Permite que el build continúe aunque haya errores de lint
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
