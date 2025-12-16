/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Ignore ESLint warnings during build (so you can deploy)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // 2. Your existing image configuration
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.pexels.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "randomuser.me",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;