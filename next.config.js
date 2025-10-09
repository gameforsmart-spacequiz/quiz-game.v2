/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Ensure environment variables are available at build time
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  // Add experimental features for better production support
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
};

module.exports = nextConfig;
