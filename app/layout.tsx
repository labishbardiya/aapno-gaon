import InstallMenu from './install-menu';
import LanguageSwitch from './language-switch';
import { getLanguage } from '../lib/locale';
import '@mantine/core/styles.css';
import './styles.css';
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'AAPNO GAON',
  description: 'A local issue reporting and tracking website.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const language = await getLanguage();
  const hi = language === 'hi';
  const links = [
    ['/report', hi ? 'समस्या दर्ज करें' : 'Report an issue'],
    ['/register', hi ? 'रिपोर्ट देखें' : 'Register'],
    ['/overview', hi ? 'वार्ड सारांश' : 'Ward overview'],
  ];
  return (
    <html lang={language} {...mantineHtmlProps}>
      <head><ColorSchemeScript forceColorScheme="light" /></head>
      <body><MantineProvider forceColorScheme="light"><a className="skip-link" href="#main">{hi ? 'मुख्य सामग्री पर जाएँ' : 'Skip to main content'}</a>
        <header className="site-header"><div className="site-bar">
          <a href="/" className="wordmark"><span aria-hidden="true">आ</span>AAPNO GAON</a>
          <nav className="site-nav" aria-label={hi ? 'मुख्य नेविगेशन' : 'Main navigation'}>
            {links.map(([href, label]) => <a href={href} key={href}>{label}</a>)}
          </nav>
          <div className="site-tools"><LanguageSwitch language={language} /><InstallMenu language={language} /></div>
        </div></header>
        {children}
        <nav className="mobile-bar" aria-label={hi ? 'त्वरित नेविगेशन' : 'Quick navigation'}>
          {[['/', '⌂', hi ? 'होम' : 'Home'], ['/register', '☷', hi ? 'रजिस्टर' : 'Register'],
            ['/report', '+', hi ? 'रिपोर्ट' : 'Report'], ['/services#contact', '☎', hi ? 'नंबर' : 'Numbers']].map(([href, icon, label]) =>
            <a key={href} href={href}><span aria-hidden="true">{icon}</span>{label}</a>)}
        </nav>
        <footer className="site-footer"><a href="/" className="footer-name">AAPNO GAON</a><a href="/staff">{hi ? 'कर्मचारी लॉगिन' : 'Staff sign-in'}</a></footer></MantineProvider></body>
    </html>
  );
}
