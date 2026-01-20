import './globals.css';
import type { Metadata } from 'next';
import { Inter, Outfit, Orbitron } from 'next/font/google';
import { LanguageProvider } from '@/contexts/language-context';
import { AuthProvider } from '@/contexts/auth-context';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { PWAInstallPrompt } from '@/components/pwa-install-prompt';

const inter = Inter({ subsets: ['latin'] });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });
const orbitron = Orbitron({ subsets: ['latin'], variable: '--font-orbitron', weight: ['400', '500', '600', '700', '800', '900'] });

export const metadata: Metadata = {
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
  authors: [{ name: 'Space-Quiz Team', url: 'https://space-quiz.vercel.app' }],
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
    url: 'https://space-quiz.vercel.app',
    siteName: 'Space-Quiz',
    title: 'Space-Quiz',
    description: 'Space-Quiz adalah platform game kuis interaktif yang seru dan edukatif! Mainkan berbagai trivia bersama teman, tantang pengetahuanmu, dan jadilah juara di antariksa pengetahuan.',
    images: [
      {
        url: '/images/logo/spacequizv2.webp',
        width: 1200,
        height: 630,
        alt: 'Space-Quiz - Game Kuis Interaktif Luar Angkasa',
        type: 'image/webp',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space-Quiz',
    description: 'Space-Quiz adalah platform game kuis interaktif yang seru dan edukatif! Mainkan berbagai trivia bersama teman, tantang pengetahuanmu, dan jadilah juara!',
    images: ['/images/logo/spacequizv2.webp'],
    creator: '@spacequiz',
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
      <body className={`${inter.className} ${outfit.variable} ${orbitron.variable}`}>
        <ErrorBoundary>
          <LanguageProvider>
            <AuthProvider>
              {children}
              <Toaster />
              <PWAInstallPrompt />
            </AuthProvider>
          </LanguageProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
