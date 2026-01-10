'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone
      || document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    setIsIOS(iOS);

    // Check if already dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) {
      return; // Don't show for 7 days after dismissal
    }

    // Listen for beforeinstallprompt (Chrome/Android)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Show iOS prompt after short delay
    if (iOS && !standalone) {
      setTimeout(() => setShowPrompt(true), 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'linear-gradient(to top, rgba(26, 26, 46, 0.98), rgba(26, 26, 46, 0.95))',
      backdropFilter: 'blur(10px)',
      padding: '16px 20px',
      paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
      zIndex: 10000,
      borderTop: '1px solid rgba(65, 137, 221, 0.3)',
      animation: 'slideUp 0.3s ease-out',
    }}>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        maxWidth: '600px',
        margin: '0 auto',
      }}>
        {/* App Icon */}
        <div style={{
          width: '50px',
          height: '50px',
          borderRadius: '12px',
          background: '#4189DD',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          fontWeight: 'bold',
          color: 'white',
          flexShrink: 0,
        }}>
          Q
        </div>

        {/* Text */}
        <div style={{ flex: 1 }}>
          <div style={{
            color: 'white',
            fontWeight: '600',
            fontSize: '15px',
            marginBottom: '4px',
          }}>
            Install Learing
          </div>
          <div style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '13px',
            lineHeight: '1.3',
          }}>
            {isIOS
              ? <>Tap <span style={{ color: '#4189DD' }}>Share</span> then <span style={{ color: '#4189DD' }}>&quot;Add to Home Screen&quot;</span></>
              : 'Add to your home screen for the best experience'
            }
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          {!isIOS && deferredPrompt && (
            <button
              onClick={handleInstall}
              style={{
                background: '#4189DD',
                color: 'white',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Install
            </button>
          )}
          <button
            onClick={handleDismiss}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.8)',
              border: 'none',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            {isIOS ? 'Got it' : 'Later'}
          </button>
        </div>
      </div>
    </div>
  );
}
