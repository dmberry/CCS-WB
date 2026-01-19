/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false, // Hide the Next.js dev indicator
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Turbopack config (Next.js 16+ default bundler)
  // Empty config silences the webpack migration warning
  turbopack: {},
  // Webpack fallback for compatibility (used when running with --webpack flag)
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
};

module.exports = nextConfig;
