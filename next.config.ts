import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/MMS",
  async redirects() {
    return [
      // bare / (no basePath) → /MMS/login
      { source: "/", destination: "/MMS/login", basePath: false, permanent: false },
    ];
  },
};

export default nextConfig;
