import { notFound } from 'next/navigation';
import { getReceipt } from '../../../lib/report-store';

export const dynamic = 'force-dynamic';

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) notFound();
  const receipt = await getReceipt(token);
  if (!receipt) notFound();
  const steps = ['Submitted', 'Reviewed', 'In progress', 'Resolved'];
  const rejected = receipt.visibility === 'REJECTED';
  const current = receipt.status === 'RESOLVED' ? 3 : receipt.status === 'IN_PROGRESS' ? 2 :
    receipt.visibility === 'APPROVED' ? 1 : 0;
  return <main className="content"><a href="/">mySociety</a><h1>Track your report</h1>
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
    {receipt.visibility === 'PENDING_REVIEW' && <p>Waiting for staff review.</p>}
    {receipt.visibility === 'REJECTED' && <p>This report was declined during review.</p>}
  </main>;
}
