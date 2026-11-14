import { cookies, headers } from 'next/headers';

export type Language = 'en' | 'hi';

export async function getLanguage(): Promise<Language> {
  const saved = (await cookies()).get('mysociety_language')?.value;
  if (saved === 'hi' || saved === 'en') return saved;
  const preferred = (await headers()).get('accept-language')?.split(',')
    .map(item => item.split(';')[0].trim().toLowerCase().split('-')[0])
    .find(item => item === 'hi' || item === 'en');
  return preferred === 'hi' ? 'hi' : 'en';
}
