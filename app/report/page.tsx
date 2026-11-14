import { getLanguage } from '../../lib/locale';
import { getWards, readPool } from '../../lib/report-store';
import ReportForm from './report-form';

export const dynamic = 'force-dynamic';

export default async function ReportPage() {
  const language = await getLanguage();
  const hi = language === 'hi';
  const wards = await getWards().catch(() => null);
  const places = await Promise.resolve().then(() => readPool().query<{
    name: string; latitude: number; longitude: number;
  }>('select name, latitude, longitude from mysociety.local_places order by name limit 500'))
    .then(result => result.rows).catch(() => []);
  return (
    <main id="main" className="content screen-report">

      <h1>{hi ? 'समस्या दर्ज करें' : 'Report an issue'}</h1>
      {wards?.length ? <ReportForm language={language} wards={wards} places={places} /> : <p>{hi ? 'रिपोर्टिंग अभी उपलब्ध नहीं है। बाद में फिर प्रयास करें।' : 'Reporting is currently unavailable. Please try again later.'}</p>}
    </main>
  );
}
