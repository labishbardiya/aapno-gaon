import { getSharedOverview } from '../../../../lib/overview-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const instance = process.env.DEMO_INSTANCE;
  if (!instance) return new Response(null, { status: 404 });

  try {
    const { rows, cache, source } = await getSharedOverview(30, '');
    return Response.json({ instance, cache, source, rows }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ instance, status: 'unavailable' }, { status: 503 });
  }
}
