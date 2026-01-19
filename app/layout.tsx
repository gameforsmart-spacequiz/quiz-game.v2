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
  keywords: ['quiz', 'space', 'trivia', 'game', 'edukasi', 'kuis online', 'game edukasi', 'trivia game', 'multiplayer quiz', 'belajar seru'],
  authors: [{ name: 'Space-Quiz Team' }],
  creator: 'Space-Quiz',
  publisher: 'Space-Quiz',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: 'https://space-quiz.vercel.app',
    siteName: 'Space-Quiz',
    title: 'Space-Quiz',
    description: 'Space-Quiz adalah platform game kuis interaktif yang seru dan edukatif! Mainkan berbagai trivia bersama teman, tantang pengetahuanmu, dan jadilah juara di antariksa pengetahuan.',
    images: [
      {
        url: '/public/images/logo/spacequizv2.webp',
        width: 1200,
        height: 630,
        alt: 'Space-Quiz - Game Kuis Interaktif',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space-Quiz',
    description: 'Space-Quiz adalah platform game kuis interaktif yang seru dan edukatif! Mainkan berbagai trivia bersama teman.',
    images: ['/public/images/logo/spacequizv2.webp'],
  },
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport = {
  themeColor: '#cf4747',
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
