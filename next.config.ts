import type { NextConfig } from "next";
import { withMicrofrontends } from "@vercel/microfrontends/next/config";

const nextConfig: NextConfig = {
  basePath: "/MMS",
  async redirects() {
    return [
      // bare / (no basePath) → /MMS/login
      { source: "/", destination: "/MMS/login", basePath: false, permanent: false },
    ];
  },
};

export default withMicrofrontends(nextConfig);
