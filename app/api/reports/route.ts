import sharp from 'sharp';
import { z } from 'zod';
import { reportInput } from '../../../lib/report-input';
import { createReport } from '../../../lib/report-store';

import { reporterKey } from '../../../lib/reporter';

export const runtime = 'nodejs';

function json(data: object, status: number) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const key = z.uuidv4().safeParse(request.headers.get('Idempotency-Key'));
  if (!key.success) return json({ error: 'INVALID_IDEMPOTENCY_KEY' }, 400);
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return json({ error: 'UNSUPPORTED_MEDIA_TYPE' }, 415);
  }

  const reader = request.body?.getReader();
  if (!reader) return json({ error: 'INVALID_JSON' }, 400);
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0;
  let body = '';
  let payload: unknown;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 450000) {
        await reader.cancel();
        return json({ error: 'PAYLOAD_TOO_LARGE' }, 413);
      }
      body += decoder.decode(value, { stream: true });
    }
    payload = JSON.parse(body + decoder.decode());
  } catch {
    return json({ error: 'INVALID_JSON' }, 400);
  }

  if (bytes > 16384 && (typeof payload !== 'object' || payload === null || !('photo' in payload))) {
    return json({ error: 'PAYLOAD_TOO_LARGE' }, 413);
  }
  const envelope = z.object({ photo: z.string().max(430000).optional() }).safeParse(payload);
  if (!envelope.success) return json({ error: 'INVALID_PHOTO' }, 422);
  const fields = { ...payload as Record<string, unknown> };
  delete fields.photo;
  const input = reportInput.safeParse(fields);
  if (!input.success) {
    return json({ error: 'VALIDATION_ERROR', issues: input.error.issues.map(({ path, message }) => ({
      field: path.join('.'), message,
    })) }, 422);
  }

  let image: Buffer | undefined;
  if (envelope.data.photo !== undefined) {
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(envelope.data.photo)) return json({ error: 'INVALID_PHOTO' }, 422);
    try {
      const source = sharp(Buffer.from(envelope.data.photo, 'base64'), { limitInputPixels: 4000000 });
      const { format } = await source.metadata();
      if (!format || !['jpeg', 'png', 'webp'].includes(format)) return json({ error: 'INVALID_PHOTO' }, 422);
      image = await source.rotate().resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 72 }).toBuffer();
      if (image.length > 350000) return json({ error: 'INVALID_PHOTO' }, 422);
    } catch {
      return json({ error: 'INVALID_PHOTO' }, 422);
    }
  } else if (bytes > 16384) {
    return json({ error: 'PAYLOAD_TOO_LARGE' }, 413);
  }

  try {
    const result = await createReport(key.data.toLowerCase(), input.data, reporterKey(request), image, envelope.data.photo);
    if (result.kind === 'limited') return json({ error: 'DAILY_REPORT_LIMIT' }, 429);
    if (result.kind === 'conflict') return json({ error: 'IDEMPOTENCY_CONFLICT' }, 409);
    if (result.kind === 'invalidWard') return json({ error: 'INVALID_WARD' }, 422);
    return json(result.receipt, result.replayed ? 200 : 201);
  } catch {
    console.error('Report intake failed.');
    return json({ error: 'INTAKE_UNAVAILABLE' }, 503);
  }
}
