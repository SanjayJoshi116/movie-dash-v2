/** File-name slug for a chart title (`ChartBlock`'s PNG export): lowercase, dash-separated. */
export const slugify = (title: string): string =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'chart';
