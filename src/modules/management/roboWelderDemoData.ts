import { differenceInCalendarDays, eachDayOfInterval, format, isValid, parseISO, startOfDay, subDays } from 'date-fns';

export interface RoboWelderDay {
  date: string;
  running: number;
  idle: number;
  downtime: number;
  availability: number;
  utilization: number;
  cycles: number;
}

export interface RoboWelderPeriod {
  days: RoboWelderDay[];
  running: number;
  idle: number;
  downtime: number;
  total: number;
  availability: number;
  utilization: number;
  cycles: number;
  label: string;
  dateLabel: string;
}

const EPOCH = new Date(2024, 0, 1);

function dayWeights(date: Date) {
  const index = differenceInCalendarDays(date, EPOCH);
  const wave = (frequency: number, offset = 0) => (Math.sin(index * frequency + offset) + 1) / 2;
  const downtimeSpikes: Record<number, number> = { 25: 6.2, 10: 4.3, 23: 2.7, 3: 2.3, 6: 2.1 };
  return {
    running: .3 + wave(.83) * 3.8,
    idle: .5 + wave(.37, 1) * 11.2,
    downtime: downtimeSpikes[date.getDate()] ?? .25 + wave(.63) * .7,
    availability: 94.5 + Math.sin(index * .7) * 3,
    cycles: 70 + wave(.46, 2) * 420 + (date.getDate() === 22 ? 230 : 0),
  };
}

export function buildRoboWelderDemo(datePreset: string, customStartDate: string | undefined, customEndDate: string | undefined, now: Date): { period?: RoboWelderPeriod; error?: string } {
  const today = startOfDay(now);
  let start: Date;
  let end: Date;
  if (datePreset === 'custom') {
    start = customStartDate ? parseISO(customStartDate) : new Date(NaN);
    end = customEndDate ? parseISO(customEndDate) : new Date(NaN);
    if (!isValid(start) || !isValid(end)) return { error: 'Choose a start and end date to view the sample welding overview.' };
    if (start > end) return { error: 'The start date must be on or before the end date.' };
    if (differenceInCalendarDays(end, start) > 365) return { error: 'Choose up to 366 days for the sample welding overview.' };
  } else {
    end = today;
    start = subDays(end, datePreset === '7d' || datePreset === '7days' ? 6 : 29);
  }

  // Calibrate the last 30 days to the reference's hour and cycle totals.
  // All displayed aggregates and charts are calculated from these same fixtures.
  const baselineDates = eachDayOfInterval({ start: subDays(today, 29), end: today });
  const baseline = baselineDates.map(dayWeights);
  const sum = (key: 'running' | 'idle' | 'downtime' | 'availability' | 'cycles') => baseline.reduce((total, day) => total + day[key], 0);
  const runningScale = 76.4 / sum('running');
  const idleScale = 198.6 / sum('idle');
  const downtimeScale = 37.1 / sum('downtime');
  const availabilityOffset = 95.9 - sum('availability') / 30;
  const cycleScale = 8226 / sum('cycles');
  const cycleCorrection = 8226 - baseline.reduce((total, day) => total + Math.round(day.cycles * cycleScale), 0);
  const correctionDate = format(today, 'yyyy-MM-dd');

  const days = eachDayOfInterval({ start, end }).map((date): RoboWelderDay => {
    const weights = dayWeights(date);
    const running = weights.running * runningScale;
    const idle = weights.idle * idleScale;
    const downtime = weights.downtime * downtimeScale;
    const dateKey = format(date, 'yyyy-MM-dd');
    return {
      date: dateKey, running, idle, downtime,
      availability: Math.max(0, Math.min(100, weights.availability + availabilityOffset)),
      utilization: running / (running + idle + downtime) * 100,
      cycles: Math.round(weights.cycles * cycleScale) + (dateKey === correctionDate ? cycleCorrection : 0),
    };
  });
  const running = days.reduce((total, day) => total + day.running, 0);
  const idle = days.reduce((total, day) => total + day.idle, 0);
  const downtime = days.reduce((total, day) => total + day.downtime, 0);
  return {
    period: {
      days, running, idle, downtime, total: running + idle + downtime,
      availability: days.reduce((total, day) => total + day.availability, 0) / days.length,
      utilization: days.reduce((total, day) => total + day.utilization, 0) / days.length,
      cycles: days.reduce((total, day) => total + day.cycles, 0),
      label: `${days.length} day${days.length === 1 ? '' : 's'}`,
      dateLabel: `${format(start, 'dd MMM yyyy')} – ${format(end, 'dd MMM yyyy')}`,
    },
  };
}
