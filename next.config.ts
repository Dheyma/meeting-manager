import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/MMS",
  async redirects() {
    return [
      // /MMS → /MMS/login  (server-side, instant)
      { source: "/", destination: "/login", permanent: false },
      // bare / → /MMS/login
      { source: "/", destination: "/MMS/login", basePath: false, permanent: false },
    ];
  },
};

export default nextConfig;
