export type CycleStatus = 'normal' | 'deviation' | 'abnormal';
export type CycleFilter = CycleStatus | 'all';

export interface WeldingCycle {
  id: number;
  startTime: string;
  duration: number;
  averageCurrent: number;
  peakCurrent: number;
  status: CycleStatus;
}

export const STATUS_LABELS: Record<CycleStatus, string> = {
  normal: 'Normal',
  deviation: 'Deviation',
  abnormal: 'Abnormal',
};

// These fixtures are exclusively for the frontend preview. No telemetry is fetched.
export const DEMO_METRICS = {
  today: {
    averageCurrent: 27.3, peakCurrent: 52.6, activeHours: 4.83, idleHours: 2.17,
    energy: 92.6, availability: 95.9, utilization: 69.0, shiftHours: 7.00,
    averagePower: 18.9, cycles: 412, cycleTime: 42.1, rmsCurrent: 28.9,
    stability: 92.4, cycleDuration: 6.8, normal: 398, deviation: 10, abnormal: 4,
  },
  yesterday: {
    averageCurrent: 28.1, peakCurrent: 53.4, activeHours: 5.07, idleHours: 1.93,
    energy: 96.4, availability: 96.4, utilization: 72.4, shiftHours: 7.00,
    averagePower: 19.0, cycles: 386, cycleTime: 41.7, rmsCurrent: 29.6,
    stability: 93.1, cycleDuration: 6.5, normal: 374, deviation: 9, abnormal: 3,
  },
};

export type WeldingMetrics = typeof DEMO_METRICS.today;

const RECENT_CYCLES: WeldingCycle[] = [
  { id: 406, startTime: '10:11:12', duration: 38.2, averageCurrent: 27.6, peakCurrent: 48.1, status: 'normal' },
  { id: 407, startTime: '10:13:05', duration: 37.9, averageCurrent: 27.1, peakCurrent: 46.8, status: 'normal' },
  { id: 408, startTime: '10:15:02', duration: 39.1, averageCurrent: 28.4, peakCurrent: 49.3, status: 'normal' },
  { id: 409, startTime: '10:17:10', duration: 36.8, averageCurrent: 26.9, peakCurrent: 45.7, status: 'normal' },
  { id: 410, startTime: '10:19:03', duration: 38.7, averageCurrent: 27.8, peakCurrent: 47.9, status: 'normal' },
  { id: 411, startTime: '10:20:56', duration: 39.0, averageCurrent: 27.5, peakCurrent: 48.6, status: 'deviation' },
  { id: 412, startTime: '10:23:14', duration: 40.2, averageCurrent: 21.3, peakCurrent: 34.1, status: 'abnormal' },
];

export function getDemoCycles(previousDay: boolean): WeldingCycle[] {
  const earlier: WeldingCycle[] = Array.from({ length: 13 }, (_, index) => ({
    id: 393 + index,
    startTime: `09:${String(44 + index).padStart(2, '0')}:${String((index * 17) % 60).padStart(2, '0')}`,
    duration: Number((37.1 + (index % 5) * 0.7).toFixed(1)),
    averageCurrent: Number((26.5 + (index % 4) * 0.6).toFixed(1)),
    peakCurrent: Number((45.2 + (index % 6) * 0.8).toFixed(1)),
    status: index === 5 ? 'abnormal' : index === 11 ? 'deviation' : 'normal',
  }));
  return [...earlier, ...RECENT_CYCLES].map((cycle) => previousDay ? {
    ...cycle,
    id: cycle.id - 26,
    averageCurrent: Number((cycle.averageCurrent + 0.8).toFixed(1)),
    peakCurrent: Number((cycle.peakCurrent + 0.8).toFixed(1)),
  } : cycle);
}

export function getWeldingWindows(previousDay: boolean): [number, number][] {
  // Today's 290 minutes of welding + 130 idle minutes make a seven-hour shift.
  return Array.from({ length: 7 }, (_, index) => {
    const start = 12 + index * 60;
    return [start, Math.min(420, start + (index === 6 ? 44 : 41) + (previousDay ? 2 : 0))];
  });
}

export function getDemoTrend(previousDay: boolean, revision: number) {
  const windows = getWeldingWindows(previousDay);
  return Array.from({ length: 841 }, (_, index) => {
    const minute = index / 2;
    const welding = windows.some(([start, end]) => minute >= start && minute < end);
    const ripple = Math.sin(index * 2.8 + revision * 0.2);
    let current = welding ? 35 + (index % 5 === 0 ? 10 : 0) + ripple * 3.2 : 5.1 + ripple * 2.1;
    if (index === 647) current = 52.6;
    return {
      minute,
      current: Number((current + (previousDay ? 0.8 : 0)).toFixed(1)),
      welding,
      time: `${String(8 + Math.floor(minute / 60)).padStart(2, '0')}:${String(Math.floor(minute % 60)).padStart(2, '0')}:${index % 2 ? '30' : '00'}`,
    };
  });
}

export const INSIGHTS = [
  { tone: 'normal', text: 'Input current within expected range', detail: 'Average input current is within the sample 20–35 A band.' },
  { tone: 'normal', text: 'Stable welding cycles', detail: 'Most sample cycles follow the expected current signature.' },
  { tone: 'normal', text: 'No unexpected current spikes', detail: 'Peak sample input current stays below the 60 A limit.' },
  { tone: 'warning', text: 'cycles with lower current than normal', detail: 'Review the flagged cycle signatures and verify the welding setup.' },
  { tone: 'info', text: 'Idle time higher than target', detail: 'Review material loading and pauses between welding operations.' },
  { tone: 'info', text: 'Energy consumption within expected range', detail: 'Sample shift energy is within the expected 80–120 kWh band.' },
] as const;
