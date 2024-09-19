// utils/dataFormatter.ts

import { IndicatorDataPoint } from '@/services/api';

export const formatYFinanceData = (data: IndicatorDataPoint[]): IndicatorDataPoint[] => {
  return data.map((item) => ({
    date: item.date,
    value: item.value !== null ? parseFloat(item.value.toString()) : null,
  }));
};
