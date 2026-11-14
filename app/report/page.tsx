import { getWards, readPool } from '../../lib/report-store';
import ReportForm from './report-form';

export const dynamic = 'force-dynamic';

export default async function ReportPage() {
  const wards = await getWards().catch(() => null);
  const places = await Promise.resolve().then(() => readPool().query<{
    name: string; latitude: number; longitude: number;
  }>('select name, latitude, longitude from mysociety.local_places order by name limit 500'))
    .then(result => result.rows).catch(() => []);
  return (
    <main className="content">
      <a href="/">mySociety</a>
      <h1>Report an issue</h1>
      {wards?.length ? <ReportForm wards={wards} places={places} /> : <p>Reporting is currently unavailable. Please try again later.</p>}
    </main>
  );
}
