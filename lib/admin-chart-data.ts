export type AdminChartDatum = {
  label: string;
  value: number;
};

export function recordToChartData(record: Record<string, number>): AdminChartDatum[] {
  return Object.entries(record)
    .filter(([, value]) => value > 0)
    .map(([label, value]) => ({ label, value }));
}

export function mapToChartData<T>(
  items: T[],
  getLabel: (item: T) => string,
  getValue: (item: T) => number
): AdminChartDatum[] {
  return items
    .map((item) => ({
      label: getLabel(item),
      value: getValue(item),
    }))
    .filter((item) => item.value > 0);
}
