import { getLanguage } from '../lib/locale';

export default async function Home() {
  const hi = await getLanguage() === 'hi';
  const t = (en: string, hindi: string) => hi ? hindi : en;
  const shortcuts = [
    ['/report', '+', t('Report a problem', 'समस्या दर्ज करें')],
    ['/register', '☷', t('Report register', 'रिपोर्ट रजिस्टर')],
    ['/overview', '▥', t('Village statistics', 'गाँव के आँकड़े')],
    ['/services#notice', '◫', t('Notices', 'सूचनाएँ')],
    ['/services#guide', '◇', t('Service guides', 'सेवा मार्गदर्शिका')],
    ['/services#contact', '☎', t('Important numbers', 'ज़रूरी नंबर')],
    ['/services#lost-found', '⌕', t('Lost and found', 'खोया-पाया')],
    ['/services#community-request', '♡', t('Blood requests', 'रक्त अनुरोध')],
  ];
  return <main id="main" className="home">
    <section className="village-intro">
      <h1 lang="hi">आपणो गाँव</h1>
      <p className="roman-name" lang="en">AAPNO GAON</p>
      <p className="village-tagline" lang="hi">आपणो गाँव, आपणी पंचायत</p>
    </section>
    <section className="report-entry">
      <h2>{t('Report a local problem', 'गाँव की समस्या दर्ज करें')}</h2>
      <p>{t('Tell us what needs fixing and where. Use your private link to follow the work.', 'बताएँ कि समस्या क्या है और कहाँ है। काम की स्थिति अपने निजी लिंक से देखें।')}</p>
      <div className="village-actions">
        <a href="/report">{t('Report a problem', 'समस्या दर्ज करें')}</a>
        <a href="/register">{t('View register', 'रजिस्टर देखें')}</a>
      </div>
    </section>
    <section className="quick-access">
      <h2>{t('Quick access', 'सीधे जाएँ')}</h2>
      <ul>{shortcuts.map(([url, icon, label]) => <li key={url}><a href={url}>
        <span aria-hidden="true">{icon}</span><strong>{label}</strong>
      </a></li>)}</ul>
    </section>
  </main>;
}
