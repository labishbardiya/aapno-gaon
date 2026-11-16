import { getLanguage } from '../../lib/locale';
import { getWards, readPool } from '../../lib/report-store';
import { submitCommunity } from './actions';

export const dynamic = 'force-dynamic';

export default async function ServicesPage({ searchParams }: {
  searchParams: Promise<{ lang?: string; saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  const hi = params.lang ? params.lang === 'hi' : await getLanguage() === 'hi';
  const t = (en: string, hindi: string) => hi ? hindi : en;
  const [wards, directory, lostFound] = await Promise.all([
    getWards().catch(() => []),
    readPool().query<{ id: number; section: string; title: string; detail: string }>(
      'select id, section, title, detail from mysociety.community_directory where published order by id desc limit 100',
    ).then(result => result.rows).catch(() => []),
    readPool().query<{ id: string; kind: string; ward: string; detail: string }>(
      `select r.id, r.kind, w.name as ward, r.detail
       from mysociety.community_requests r join mysociety.wards w on w.id = r.ward_id
       where r.reviewed_at is not null and r.kind in ('lost', 'found')
       order by r.created_at desc limit 50`,
    ).then(result => result.rows).catch(() => []),
  ]);
  const sections = [
    ['notice', t('Notices', 'सूचनाएँ')],
    ['guide', t('Government service guides', 'सरकारी सेवा मार्गदर्शिका')],
    ['contact', t('Important numbers', 'ज़रूरी नंबर')],
  ];
  return <main id="main" className="content screen-services" lang={hi ? 'hi' : 'en'}>
    <nav className="home-links"><a href={hi ? '/services' : '/services?lang=hi'}>{hi ? 'English' : 'हिन्दी'}</a></nav>
    <h1>{t('Community services', 'सामुदायिक सेवाएँ')}</h1>
    <h2>{t('Village directory', 'गाँव निर्देशिका')}</h2>
    <ul>{wards.map(ward => <li key={ward.id}><a href={`/register?ward=${ward.id}`}>{ward.name}</a>{ward.coverage_hint && <p>{ward.coverage_hint}</p>}</li>)}</ul>
    {sections.map(([section, title]) => <section key={section} id={section}>
      <h2>{title}</h2>
      {section === 'contact' && <p><a href="tel:112">{t('Emergency assistance: 112', 'आपातकालीन सहायता: 112')}</a></p>}
      {directory.filter(item => item.section === section).map(item => <article key={item.id}><h3>{item.title}</h3><p>{item.detail}</p></article>)}
    </section>)}
    <h2>{t('Voter services', 'मतदाता सेवाएँ')}</h2>
    <p><a href="https://voters.eci.gov.in/">{t('Election Commission voter portal', 'निर्वाचन आयोग का मतदाता पोर्टल')}</a></p>
    <h2 id="lost-found">{t('Lost and found listings', 'खोया-पाया सूची')}</h2>
    {!lostFound.length && <p>{t('No reviewed listings yet.', 'अभी कोई समीक्षा की गई सूची नहीं है।')}</p>}
    <ul className="register-list">{lostFound.map(item => <li key={item.id}>
      <strong>{item.kind === 'lost' ? t('Lost', 'खोया') : t('Found', 'मिला')} · {item.ward}</strong>
      <p>{item.detail}</p>
    </li>)}</ul>
    <h2 id="community-request">{t('Lost and found or blood requests', 'खोया-पाया या रक्त अनुरोध')}</h2>
    {params.saved && <p role="status">{t('Saved for staff review.', 'कर्मचारी समीक्षा के लिए अनुरोध सहेजा गया।')}</p>}
    {params.error && <p role="alert">{t('Check your details and try again.', 'जानकारी जाँचकर फिर कोशिश करें।')}</p>}
    <form className="report-form" action={submitCommunity}>
      <input type="hidden" name="lang" value={hi ? 'hi' : 'en'} />
      <label>{t('Request type', 'अनुरोध का प्रकार')}<select name="kind" required>
        <option value="lost">{t('Lost item', 'खोई वस्तु')}</option><option value="found">{t('Found item', 'मिली वस्तु')}</option>
        <option value="blood-request">{t('Blood request', 'रक्त अनुरोध')}</option><option value="donor">{t('Register as a donor', 'रक्तदाता के रूप में पंजीकरण')}</option>
      </select></label>
      <label>{t('Village', 'गाँव')}<select name="ward" required>{wards.map(ward => <option key={ward.id} value={ward.id}>{ward.name}</option>)}</select></label>
      <label>{t('Blood group (for blood requests and donors)', 'रक्त समूह (रक्त अनुरोध और रक्तदाताओं के लिए)')}<select name="blood">
        <option value="">{t('Not applicable', 'लागू नहीं')}</option>
        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(group => <option key={group}>{group}</option>)}
      </select></label>
      <p>{t('Leave personal details out of the description. Reviewed lost-and-found descriptions can be public.', 'विवरण में निजी जानकारी न दें। समीक्षा के बाद खोया-पाया विवरण सार्वजनिक हो सकता है।')}</p>
      <label>{t('Description and location', 'विवरण और स्थान')}<textarea name="detail" required maxLength={1000} /></label>
      <label>{t('Private callback number', 'संपर्क के लिए निजी नंबर')}<input type="tel" name="phone" required maxLength={16} /></label>
      <label><span><input type="checkbox" name="consent" required /> {t('Staff may contact me about this submission.', 'कर्मचारी इस अनुरोध के बारे में मुझसे संपर्क कर सकते हैं।')}</span></label>
      <button disabled={!wards.length}>{t('Send for review', 'समीक्षा के लिए भेजें')}</button>
    </form>
  </main>;
}
