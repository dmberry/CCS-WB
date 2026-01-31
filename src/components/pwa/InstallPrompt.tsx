/**
 * PWA Install Prompt Component
 *
 * Shows a dismissible banner prompting users to install the PWA.
 * Listens for beforeinstallprompt event and triggers native install flow.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt(): React.ReactElement | null {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  /**
   * Handle beforeinstallprompt event
   */
  useEffect(() => {
    // Check if already dismissed in this session
    const dismissed = sessionStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      // Prevent the default mini-infobar
      e.preventDefault();

      // Store the event for later use
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  /**
   * Handle install button click
   */
  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for user choice
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted PWA install');
    } else {
      console.log('User dismissed PWA install');
    }

    // Clear the deferred prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  }, [deferredPrompt]);

  /**
   * Handle dismiss button click
   */
  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    setIsDismissed(true);
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  }, []);

  if (!showPrompt || isDismissed) {
    return null;
  }

  return (
    <>
      {/* Desktop banner (bottom-right) */}
      <div className="hidden md:block fixed bottom-4 right-4 z-50 max-w-sm">
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-4">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3 pr-6">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#7D4A3A] to-[#A67C6A] rounded-lg flex items-center justify-center">
              <Download className="h-5 w-5 text-white" />
            </div>

            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 text-sm mb-1">
                Install CCS Workbench
              </h3>
              <p className="text-xs text-slate-600 mb-3">
                Install as an app for offline access, faster loading, and a native experience.
              </p>

              <button
                onClick={handleInstall}
                className="w-full bg-[#7D4A3A] hover:bg-[#6B3E2F] text-white text-sm font-medium py-2 px-4 rounded transition-colors"
              >
                Install App
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-white border-t border-slate-200 shadow-lg p-4">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3 pr-6 mb-3">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#7D4A3A] to-[#A67C6A] rounded-lg flex items-center justify-center">
              <Download className="h-5 w-5 text-white" />
            </div>

            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 text-sm">
                Install CCS Workbench
              </h3>
              <p className="text-xs text-slate-600">
                Get the full app experience
              </p>
            </div>
          </div>

          <button
            onClick={handleInstall}
            className="w-full bg-[#7D4A3A] hover:bg-[#6B3E2F] text-white text-sm font-medium py-2.5 px-4 rounded transition-colors"
          >
            Install App
          </button>
        </div>
      </div>
    </>
  );
}
