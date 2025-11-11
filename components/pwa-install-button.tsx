'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isDevelopment, setIsDevelopment] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if we're in development mode (check hostname)
    const isDev = window.location.hostname === 'localhost' ||
                  window.location.hostname === '127.0.0.1' ||
                  window.location.port !== '';
    setIsDevelopment(isDev);

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      setCanInstall(false);
      return;
    }

    // Check if service worker is registered (indicates PWA is available)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          setCanInstall(true);
        } else if (isDev) {
          // In development, show button even without service worker (for testing UI)
          setCanInstall(true);
        }
      }).catch(() => {
        // If service worker check fails, still show in dev mode
        if (isDev) {
          setCanInstall(true);
        }
      });
    } else if (isDev) {
      // Show button in dev mode even if service worker not supported
      setCanInstall(true);
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Save the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if app was just installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
          console.log('User accepted the install prompt');
          setIsInstalled(true);
        } else {
          console.log('User dismissed the install prompt');
          // Keep the button visible, browser might trigger beforeinstallprompt again later
        }

        // Clear the deferredPrompt (it can only be used once)
        setDeferredPrompt(null);
      } catch (error) {
        console.error('Error showing install prompt:', error);
        setDeferredPrompt(null);
      }
    } else {
      // If no prompt available (development mode or prompt already used)
      if (isDevelopment) {
        alert('PWA install hanya tersedia di production build. Jalankan "npm run build && npm start" untuk test install prompt.');
      } else {
        // Guide user to browser menu
        console.log('Install prompt not available. Please use browser menu to install.');
        // Optionally show a toast or message to user
      }
    }
  };

  // Don't show if already installed
  if (isInstalled) {
    return null;
  }

  // Show button if:
  // 1. PWA is available (service worker registered) in production
  // 2. OR in development mode (for testing UI)
  if (!canInstall && !isDevelopment) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={handleInstallClick}
        size="lg"
        className="rounded-full shadow-lg hover:shadow-xl transition-all duration-300 h-14 px-6 gap-2"
        disabled={!deferredPrompt && !canInstall}
      >
        <Download className="w-5 h-5" />
        <span className="hidden sm:inline">Install App</span>
        <span className="sm:hidden">Install</span>
      </Button>
    </div>
  );
}

