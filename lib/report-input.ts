import { z } from 'zod';
import { categories } from './report-categories';

const location = z.strictObject({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyM: z.number().nonnegative().nullable().optional(),
  source: z.enum(['device', 'manual']),
}).refine(({ source, accuracyM }) => source === 'device' || accuracyM == null, {
  path: ['accuracyM'],
  message: 'Only a device pin can include device accuracy.',
});

export const reportInput = z.strictObject({
  wardId: z.number().int().min(1).max(2147483647),
  category: z.enum(categories),
  landmark: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000),
  location: location.nullish(),
  callbackName: z.string().trim().max(100).optional(),
  callbackPhone: z.string().trim().regex(/^[+]?[0-9]{10,15}$/).optional(),
});

export type ReportInput = z.infer<typeof reportInput>;
