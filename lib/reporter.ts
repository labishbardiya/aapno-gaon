import { createHmac } from 'node:crypto';
import { z } from 'zod';

export function reporterKey(request: Request) {
  const secret = process.env.RECEIPT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) throw new Error('Intake is not configured.');
  // Vercel overwrites this header. Local deployments share a single test bucket.
  const address = process.env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for') : 'local';
  const fingerprint = (value: string) => createHmac('sha256', secret).update(value).digest('hex');
  const device = z.uuidv4().safeParse(request.headers.get('X-Reporter-Device'));
  const network = fingerprint('intake-network:' + (address ?? 'unknown'));
  return {
    reporter: device.success ? fingerprint('intake-device:' + device.data.toLowerCase()) : network,
    network,
  };
}
