const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // Disable di development
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Enable image optimization for better performance
  images: {
    // Enable optimization for better LCP and performance scores
    unoptimized: false,
    // Allow external images from Unsplash and other sources
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/**',
      },
    ],
    // Enable modern image formats for smaller file sizes
    formats: ['image/avif', 'image/webp'],
    // Optimize device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    // Minimize layout shift with placeholder
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days cache
  },
  // Ensure environment variables are available at build time
  env: {
    // Main Supabase (quizzes, profiles, auth)
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    // Supabase B (participants, sessions - game data)
    NEXT_PUBLIC_SUPABASE_B_URL: process.env.NEXT_PUBLIC_SUPABASE_B_URL,
    NEXT_PUBLIC_SUPABASE_B_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_B_ANON_KEY,
  },
  // Add server external packages for better production support
  serverExternalPackages: ['@supabase/supabase-js'],
  // Compiler optimizations
  compiler: {
    // Remove console.log in production for smaller bundle
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
};

module.exports = withPWA(nextConfig);
