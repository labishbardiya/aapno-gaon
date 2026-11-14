import { open311Error, open311Response, publicRequests } from '../../../../../lib/open311';

export async function GET(_request: Request, { params }: { params: Promise<{ request: string }> }) {
  const match = /^(MS-[A-F0-9]{18})\.json$/.exec((await params).request);
  if (!match) return open311Error(404, 'Public request not found.');
  try {
    const reports = await publicRequests({ ids: [match[1]] });
    return reports.length ? open311Response(reports) : open311Error(404, 'Public request not found.');
  } catch {
    return open311Error(503, 'Public requests are temporarily unavailable.');
  }
}
