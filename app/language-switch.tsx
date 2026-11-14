'use client';

import type { Language } from '../lib/locale';

export default function LanguageSwitch({ language }: { language: Language }) {
  const next = language === 'hi' ? 'en' : 'hi';
  return <button className="language-switch" type="button" lang={next} onClick={() => {
    document.cookie = `mysociety_language=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    const url = new URL(location.href);
    url.searchParams.delete('lang');
    location.replace(url);
  }}>{next === 'hi' ? 'हिन्दी' : 'English'}</button>;
}
