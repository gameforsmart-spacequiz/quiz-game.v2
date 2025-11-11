import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { LanguageProvider } from '@/contexts/language-context';
import { AuthProvider } from '@/contexts/auth-context';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { PWAInstallButton } from '@/components/pwa-install-button';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Space-Quiz',
  description: 'Play a quiz game with your friends!',
  manifest: '/site.webmanifest',
  themeColor: '#cf4747',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Space-Quiz',
  },
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <LanguageProvider>
            <AuthProvider>
              {children}
              <Toaster />
              <PWAInstallButton />
            </AuthProvider>
          </LanguageProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
