import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  rewrites: () => {
    return [
      {
        source: "/worker/:path*",
        destination: "http://localhost:8787/:path*",
      },
    ];
  },
};

export default nextConfig;
