import { getLanguage } from '../../../lib/locale';
import { notFound } from 'next/navigation';
import { getReceipt } from '../../../lib/report-store';

export const dynamic = 'force-dynamic';

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const hi = await getLanguage() === 'hi';
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) notFound();
  const receipt = await getReceipt(token);
  if (!receipt) notFound();
  const steps = hi ? ['दर्ज', 'समीक्षित', 'कार्य जारी', 'हल हुआ'] : ['Submitted', 'Reviewed', 'In progress', 'Resolved'];
  const rejected = receipt.visibility === 'REJECTED';
  const current = receipt.status === 'RESOLVED' ? 3 : receipt.status === 'IN_PROGRESS' ? 2 :
    receipt.visibility === 'APPROVED' ? 1 : 0;
  return <main className="content"><a href="/">mySociety</a><h1>{hi ? 'अपनी रिपोर्ट की स्थिति देखें' : 'Track your report'}</h1>
    <p>Ticket <strong>{receipt.ticket_code}</strong></p>
    <ol className="ticket-progress" aria-label="Report progress">
      {steps.map((step, index) => {
        const state = index < current || (rejected && index === 0) ? 'complete' :
          index === current ? 'current' : 'upcoming';
        return <li key={step} data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
          <span aria-hidden="true">{state === 'complete' ? '✓' : index + 1}</span>
          {step}
        </li>;
      })}
    </ol>
    {receipt.due_on && <p>Expected completion: <time dateTime={receipt.due_on}>{receipt.due_on}</time></p>}
    {receipt.visibility === 'PENDING_REVIEW' && <p>{hi ? 'कर्मचारी समीक्षा की प्रतीक्षा है।' : 'Waiting for staff review.'}</p>}
    {receipt.visibility === 'REJECTED' && <p>{hi ? 'समीक्षा के दौरान यह रिपोर्ट अस्वीकार कर दी गई।' : 'This report was declined during review.'}</p>}
  </main>;
}
