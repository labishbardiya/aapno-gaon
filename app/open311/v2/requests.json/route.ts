import { z } from 'zod';
import { categories } from '../../../../lib/report-categories';
import { open311Error, open311Response, publicRequests } from '../../../../lib/open311';

const filters = z.object({
  service_request_id: z.string().max(2200).optional(),
  service_code: z.string().max(300).optional(),
  status: z.enum(['open', 'closed']).optional(),
  start_date: z.iso.datetime({ offset: true }).optional(),
  end_date: z.iso.datetime({ offset: true }).optional(),
});

export async function GET(request: Request) {
  const result = filters.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!result.success) return open311Error(400, 'Invalid request filters.');
  const input = result.data;
  const ids = input.service_request_id?.split(',');
  const codes = input.service_code?.split(',');
  if (ids?.some(id => !/^MS-[A-F0-9]{18}$/.test(id)) ||
      codes?.some(code => !categories.some(category => category === code))) {
    return open311Error(400, 'Invalid request ID or service code.');
  }
  const end = input.end_date ?? new Date().toISOString();
  const start = input.start_date ?? new Date(Date.parse(end) - 90 * 86400000).toISOString();
  if (Date.parse(start) > Date.parse(end) || Date.parse(end) - Date.parse(start) > 90 * 86400000) {
    return open311Error(400, 'Date range must be at most 90 days.');
  }
  try {
    return open311Response(await publicRequests(ids ? { ids } : {
      categories: codes, status: input.status, start, end,
    }));
  } catch {
    return open311Error(503, 'Public requests are temporarily unavailable.');
  }
}
