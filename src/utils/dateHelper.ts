/**
 * Date & Timezone Helper for Lazuardi GCS Facility Management
 * Timezone standard: Asia/Jakarta (WIB, UTC+7)
 */

/**
 * Returns the current date in YYYY-MM-DD format using Asia/Jakarta (WIB) timezone.
 */
export function getJakartaDateString(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date); // Returns YYYY-MM-DD
  } catch {
    // Fallback: Add 7 hours to UTC
    const local = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    return local.toISOString().split('T')[0];
  }
}

/**
 * Returns current hour (0-23) in Asia/Jakarta (WIB) timezone.
 */
export function getJakartaHour(date: Date = new Date()): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      hour: 'numeric',
      hour12: false,
    });
    return parseInt(formatter.format(date), 10);
  } catch {
    const local = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    return local.getUTCHours();
  }
}

/**
 * Formats a YYYY-MM-DD date string into Indonesian localized readable date.
 * E.g., "Kamis, 20 Agustus 2026"
 */
export function formatJakartaDisplayDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(dateObj);
  } catch {
    return dateStr;
  }
}

/**
 * Checks if a MasterTask is active (handling both boolean and string variants).
 */
export function isMasterTaskActive(task: { isActive?: boolean | string }): boolean {
  if (task.isActive === false) return false;
  if (typeof task.isActive === 'string') {
    const s = task.isActive.trim().toUpperCase();
    if (s === 'NONAKTIF' || s === 'TIDAK' || s === 'FALSE' || s === 'OFF' || s === 'NO') {
      return false;
    }
  }
  return true;
}

/**
 * Returns current minute (0-59) in Asia/Jakarta (WIB) timezone.
 */
export function getJakartaMinute(date: Date = new Date()): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      minute: 'numeric',
    });
    return parseInt(formatter.format(date), 10);
  } catch {
    const local = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    return local.getUTCMinutes();
  }
}

/**
 * Checks if an incidental task (JobBareng) has expired based on its date.
 * A Job Bareng stays visible throughout the entire day it is scheduled for,
 * and only expires when the date changes (job date is not today) or if explicitly canceled.
 */
export function isJobBarengExpired(job: {
  date?: string;
  timeTarget?: string;
  createdAt?: string;
  status?: string;
}): boolean {
  if (job.status === 'Dibatalkan') {
    return true;
  }

  const today = getJakartaDateString();
  const rawDate = job.date || job.createdAt;
  const jobDate = normalizeDateString(rawDate) || today;

  // If job date is not today (day changed / past date), it is automatically expired so it doesn't pile up
  if (jobDate !== today) {
    return true;
  }

  return false;
}

/**
 * Normalizes any date input (string, Date, timestamp) into YYYY-MM-DD format using Asia/Jakarta (WIB) timezone.
 * Handles ISO timestamps (e.g. 2026-09-02T23:30:00.000Z), DD/MM/YYYY, YYYY-MM-DD, and Date objects.
 * Prevents early-morning (before 07:00 AM WIB) tasks from being misplaced into yesterday due to UTC offset.
 */
export function normalizeDateString(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  if (dateInput instanceof Date) {
    return getJakartaDateString(dateInput);
  }
  let s = String(dateInput).trim();
  if (!s) return '';

  // 1. If strictly already YYYY-MM-DD (e.g. "2026-09-03")
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }

  // 2. ISO timestamp or string containing timezone/time indicator:
  // e.g. "2026-09-02T23:30:00.000Z", "2026-09-02T17:00:00.000Z", "2026-09-02T23:45:10Z"
  // CRITICAL: Interpret in Asia/Jakarta (WIB, UTC+7)!
  // If we just split('T'), any timestamp before 07:00 AM WIB yields yesterday in UTC!
  if (s.includes('T') || s.endsWith('Z') || s.includes('+') || s.includes('GMT')) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return getJakartaDateString(d);
    }
  }

  // 3. String starting with YYYY-MM-DD followed by time or space (e.g. "2026-09-03 06:15:00")
  if (/^\d{4}-\d{2}-\d{2}\s/.test(s)) {
    return s.split(' ')[0].trim();
  }

  // 4. Slash separated (e.g. 28/08/2026 or 2026/08/28 or 8/28/2026 or 31/8/2026)
  if (s.includes('/')) {
    const datePart = s.includes(' ') ? s.split(' ')[0].trim() : s;
    const parts = datePart.split('/').map((p) => p.trim());
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        // DD/MM/YYYY or MM/DD/YYYY -> YYYY-MM-DD
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else if (parts[0].length === 4) {
        // YYYY/MM/DD -> YYYY-MM-DD
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
    }
  }

  // 5. Dash separated (e.g. 31-08-2026 or 1-8-2026)
  if (s.includes('-')) {
    const datePart = s.includes(' ') ? s.split(' ')[0].trim() : s;
    const parts = datePart.split('-').map((p) => p.trim());
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
    }
  }

  // 6. Generic Date parse fallback
  const fallbackDate = new Date(s);
  if (!isNaN(fallbackDate.getTime())) {
    return getJakartaDateString(fallbackDate);
  }

  return s;
}

/**
 * Compares two dates ignoring formatting differences or timestamp details.
 */
export function isSameDay(date1?: string | Date | null, date2?: string | Date | null): boolean {
  if (!date1 || !date2) return false;
  const d1 = normalizeDateString(date1);
  const d2 = normalizeDateString(date2);
  return d1 !== '' && d1 === d2;
}

