/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;
