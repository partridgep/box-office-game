export type WeeklyGrossPoint = {
  week: number;
  cumulativeDomestic: number;
};

export const MOCK_WEEKLY_GROSS: WeeklyGrossPoint[] = [
  { week: 1, cumulativeDomestic: 82_500_000 },
  { week: 2, cumulativeDomestic: 145_000_000 },
  { week: 3, cumulativeDomestic: 198_000_000 },
  { week: 4, cumulativeDomestic: 235_000_000 },
  { week: 5, cumulativeDomestic: 262_000_000 },
  { week: 6, cumulativeDomestic: 280_000_000 },
  { week: 8, cumulativeDomestic: 295_000_000 },
  { week: 10, cumulativeDomestic: 305_000_000 },
];

export function getWeeklyGrossData(
  hasOpeningData: boolean,
  mockData: WeeklyGrossPoint[] = MOCK_WEEKLY_GROSS
): WeeklyGrossPoint[] | null {
  if (!hasOpeningData) return null;
  return mockData;
}
