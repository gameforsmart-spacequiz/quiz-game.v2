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
  title: 'Space-Quiz',
  description: 'Play a quiz game with your friends!',
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
