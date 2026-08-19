/**
 * Saturday Date Helper for Coordinator & Admin Weekly Evaluation
 * Converts abstract "Minggu ke-X" into explicit Saturday calendar dates:
 * (e.g. "Sabtu, 22 Agustus 2026").
 */

export interface SaturdayOption {
  isoDate: string; // e.g. "2026-08-22"
  label: string; // e.g. "Sabtu, 22 Agustus 2026 (Sabtu Pekan Ini)"
  shortLabel: string; // e.g. "Sabtu, 22 Agt 2026"
  formattedFull: string; // e.g. "Sabtu, 22 Agustus 2026"
  isCurrentWeek: boolean;
  isPast: boolean;
}

/**
 * Get the Saturday of the current week (or nearest relative Saturday).
 * In JS getDay(): 0 = Sun, 1 = Mon, ..., 6 = Sat
 */
export function getCurrentWeekSaturday(baseDate: Date = new Date()): Date {
  const date = new Date(baseDate);
  const day = date.getDay(); // 0 is Sunday, 6 is Saturday
  // If today is Sunday (0), diff to previous or upcoming Saturday?
  // Standard: diff to Saturday of current calendar week
  const diffToSaturday = 6 - day;
  const saturday = new Date(date);
  saturday.setDate(date.getDate() + diffToSaturday);
  saturday.setHours(0, 0, 0, 0);
  return saturday;
}

/**
 * Format a Date to Indonesian Saturday representation
 */
export function formatSaturdayDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date);

  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format ISO Date string (YYYY-MM-DD)
 */
export function toISODateString(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Generate a list of recent and upcoming Saturday options for dropdown selection
 * Defaults to 8 past Saturdays + current Saturday + 1 upcoming Saturday.
 */
export function getSaturdayOptionsList(countPast: number = 8, countFuture: number = 1): SaturdayOption[] {
  const currentSaturday = getCurrentWeekSaturday();
  const currentIso = toISODateString(currentSaturday);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const options: SaturdayOption[] = [];

  // Future Saturdays
  for (let i = countFuture; i >= 1; i--) {
    const d = new Date(currentSaturday);
    d.setDate(currentSaturday.getDate() + (i * 7));
    const iso = toISODateString(d);
    const full = formatSaturdayDate(d);
    options.push({
      isoDate: iso,
      label: `${full} (Mendatang)`,
      shortLabel: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
      formattedFull: full,
      isCurrentWeek: false,
      isPast: false,
    });
  }

  // Current Saturday
  const currentFull = formatSaturdayDate(currentSaturday);
  options.push({
    isoDate: currentIso,
    label: `${currentFull} (Sabtu Pekan Ini)`,
    shortLabel: currentSaturday.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
    formattedFull: currentFull,
    isCurrentWeek: true,
    isPast: currentSaturday < now,
  });

  // Past Saturdays
  for (let i = 1; i <= countPast; i++) {
    const d = new Date(currentSaturday);
    d.setDate(currentSaturday.getDate() - (i * 7));
    const iso = toISODateString(d);
    const full = formatSaturdayDate(d);
    const isLastWeek = i === 1;
    options.push({
      isoDate: iso,
      label: `${full}${isLastWeek ? ' (Sabtu Lalu)' : ''}`,
      shortLabel: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
      formattedFull: full,
      isCurrentWeek: false,
      isPast: true,
    });
  }

  return options;
}
