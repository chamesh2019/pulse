import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  rewrites: () => {
    return [
      {
        source: "/worker/:path*",
        destination: process.env.NEXT_PUBLIC_API_URL + "/:path*",
      },
    ];
  },
};

export default nextConfig;
