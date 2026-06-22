import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "www.gaestehaus-braun.de",
      },
      {
        protocol: "https",
        hostname: "gaestehaus-braun.de",
      },
    ],
  },
};

export default nextConfig;
