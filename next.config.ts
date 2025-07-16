import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ui-avatars.com",
        pathname: "/api/**", // Allows all paths under /api/
      },
      {
        protocol: "https",
        hostname: "www.google.com",
        pathname: "/**", // Allows all paths including favicon.ico
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google profile images
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
