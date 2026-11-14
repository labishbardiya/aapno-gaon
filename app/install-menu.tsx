'use client';

import { useEffect, useState } from 'react';

type InstallEvent = Event & { prompt(): Promise<unknown> };

export default function InstallMenu({ language }: { language: 'en' | 'hi' }) {
  const hi = language === 'hi';
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  useEffect(() => {
    function offer(event: Event) {
      event.preventDefault();
      setPrompt(event as InstallEvent);
    }
    window.addEventListener('beforeinstallprompt', offer);
    return () => window.removeEventListener('beforeinstallprompt', offer);
  }, []);
  return <details className="site-menu">
    <summary>{hi ? 'मेनू' : 'Menu'} <span aria-hidden="true">☰</span></summary>
    <nav aria-label={hi ? 'अन्य विकल्प' : 'More options'}>
      <a href="/report">{hi ? 'समस्या दर्ज करें' : 'Report an issue'}</a>
      <a href="/register">{hi ? 'रिपोर्ट देखें' : 'Register'}</a>
      <a href="/overview">{hi ? 'वार्ड सारांश' : 'Ward overview'}</a>
      <a href="/services">{hi ? 'सामुदायिक सेवाएँ' : 'Community services'}</a>
      <a href="/staff">{hi ? 'कर्मचारी लॉगिन' : 'Staff sign-in'}</a>
      <button type="button" onClick={async () => {
        if (!prompt) return setShowHelp(true);
        try { await prompt.prompt(); } catch { setShowHelp(true); }
        setPrompt(null);
      }}>{hi ? 'ऐप इंस्टॉल करें' : 'Install app'}</button>
    </nav>
    {showHelp && <p>Use your browser menu to install AAPNO GAON or choose Add to Home Screen where available.</p>}
  </details>;
}
