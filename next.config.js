const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // Disable di development
  // Enable runtime caching for better offline support
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/images\.unsplash\.com/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'unsplash-images',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api',
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Performance optimizations
  swcMinify: true, // Use SWC for faster minification
  reactStrictMode: true,
  productionBrowserSourceMaps: false, // Disable source maps in production

  // Optimize imports to reduce bundle size
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
      skipDefaultConversion: true,
    },
    '@radix-ui/react-icons': {
      transform: '@radix-ui/react-icons/dist/{{member}}.js',
    },
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
    // Add quality settings for better mobile performance
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Optimize headers for better caching
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        locale: false,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
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
    // Enable emotion if used
    emotion: false,
    // Remove React properties
    reactRemoveProperties: process.env.NODE_ENV === 'production',
  },

  // Experimental features for better performance
  experimental: {
    // Enable optimizePackageImports for smaller bundles
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'framer-motion',
      'date-fns',
    ],
    // Enable concurrent features
    webpackBuildWorker: true,
  },
};

module.exports = withPWA(nextConfig);
