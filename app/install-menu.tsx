'use client';

import { useEffect, useState } from 'react';

type InstallEvent = Event & { prompt(): Promise<unknown> };

export default function InstallMenu() {
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
  return <details>
    <summary aria-label="More options">☰ Menu</summary>
    <nav className="home-links" aria-label="More options">
      <a href="/services">Community services</a><a href="/services?lang=hi" lang="hi">हिन्दी</a>
      <button type="button" onClick={async () => {
        if (!prompt) return setShowHelp(true);
        try { await prompt.prompt(); } catch { setShowHelp(true); }
        setPrompt(null);
      }}>Install app</button>
    </nav>
    {showHelp && <p>Use your browser menu to install mySociety or choose Add to Home Screen where available.</p>}
  </details>;
}
