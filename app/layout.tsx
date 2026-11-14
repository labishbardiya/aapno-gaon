import LanguageSwitch from './language-switch';
import { getLanguage } from '../lib/locale';
import '@mantine/core/styles.css';
import './styles.css';
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'mySociety',
  description: 'A local issue reporting and tracking website.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const language = await getLanguage();
  return (
    <html lang={language} {...mantineHtmlProps}>
      <head><ColorSchemeScript forceColorScheme="light" /></head>
      <body><MantineProvider forceColorScheme="light"><LanguageSwitch language={language} />{children}</MantineProvider></body>
    </html>
  );
}
