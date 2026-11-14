export const categories = [
  'water', 'roads', 'waste', 'drainage', 'streetlights', 'waterlogging',
  'stray-animals', 'mosquito-control', 'education', 'sanitation', 'employment',
  'housing-pensions', 'other',
] as const;

export function categoryLabel(category: string) {
  return category.replaceAll('-', ' ').replace(/^./, letter => letter.toUpperCase());
}
