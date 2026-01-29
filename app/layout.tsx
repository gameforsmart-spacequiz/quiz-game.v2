import './globals.css';
import type { Metadata } from 'next';
import { Inter, Outfit, Orbitron } from 'next/font/google';
import { LanguageProvider } from '@/contexts/language-context';
import { AuthProvider } from '@/contexts/auth-context';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { PWAInstallPrompt } from '@/components/pwa-install-prompt';

// Optimized font loading with display: swap, fallback fonts, and selective preload
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter',
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
  adjustFontFallback: true,
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
  preload: false, // Don't preload secondary fonts
  fallback: ['system-ui', 'sans-serif'],
  adjustFontFallback: true,
});

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  weight: ['400', '700', '900'], // Only load essential weights
  display: 'swap',
  preload: false, // Don't preload decorative fonts
  fallback: ['monospace'],
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  metadataBase: new URL('https://spacequizv1.vercel.app'),
  title: {
    default: 'Space-Quiz',
    template: '%s | Space-Quiz',
  },
  description: 'Space-Quiz adalah platform game kuis interaktif yang seru dan edukatif! Mainkan berbagai trivia bersama teman, tantang pengetahuanmu, dan jadilah juara di antariksa pengetahuan. Cocok untuk pembelajaran, hiburan, dan kompetisi.',
  keywords: [
    'quiz',
    'space quiz',
    'trivia',
    'game',
    'edukasi',
    'kuis online',
    'game edukasi',
    'trivia game',
    'multiplayer quiz',
    'belajar seru',
    'quiz interaktif',
    'game multiplayer',
    'quiz indonesia'
  ],
  authors: [{ name: 'Space-Quiz Team', url: 'https://spacequizv1.vercel.app' }],
  creator: 'Space-Quiz Team',
  publisher: 'Space-Quiz',
  applicationName: 'Space-Quiz',
  category: 'Games',
  classification: 'Educational Game',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    alternateLocale: ['en_US'],
    url: 'https://spacequizv1.vercel.app',
    siteName: 'Space-Quiz',
    title: 'Space-Quiz',
    description: 'Space-Quiz adalah platform game kuis interaktif yang seru dan edukatif! Mainkan berbagai trivia bersama teman, tantang pengetahuanmu, dan jadilah juara di antariksa pengetahuan.',
    images: [
      {
        url: '/images/logo/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Space-Quiz Logo',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space-Quiz',
    description: 'Space-Quiz adalah platform game kuis interaktif yang seru dan edukatif! Mainkan berbagai trivia bersama teman, tantang pengetahuanmu, dan jadilah juara!',
    creator: '@spacequiz',
    images: ['/images/logo/og-image.png'],
  },
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Space-Quiz',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#0f172a',
    'msapplication-config': '/browserconfig.xml',
  },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#6366f1' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  colorScheme: 'dark light',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Preload critical images for faster LCP */}
        <link rel="preload" href="/images/galaxy.webp" as="image" type="image/webp" fetchPriority="high" />
        <link rel="preload" href="/images/logo/spacequizv2.webp" as="image" type="image/webp" fetchPriority="high" />

        {/* Preconnect to external domains for faster loading */}
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://plus.unsplash.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://plus.unsplash.com" />
        {/* Preconnect to Supabase */}
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL || ''} crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} ${outfit.variable} ${orbitron.variable}`}>
        <LanguageProvider>
          <ErrorBoundary>
            <AuthProvider>
              {children}
              <Toaster />
              <PWAInstallPrompt />
            </AuthProvider>
          </ErrorBoundary>
        </LanguageProvider>
      </body>
    </html>
  );
}
