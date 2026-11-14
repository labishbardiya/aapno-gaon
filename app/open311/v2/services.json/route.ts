import { categories, categoryLabel } from '../../../../lib/report-categories';

export function GET() {
  return Response.json(categories.map(code => ({
    service_code: code,
    service_name: categoryLabel(code),
    description: 'Report a local issue in this category.',
    metadata: false,
    type: 'realtime',
    keywords: code,
    group: 'Civic issues',
  })));
}
