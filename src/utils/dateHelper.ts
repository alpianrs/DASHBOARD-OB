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
 * Checks if an incidental task (JobBareng) has expired based on its date and target time.
 * If date is in the past, or if today and timeTarget has passed, returns true.
 */
export function isJobBarengExpired(job: {
  date?: string;
  timeTarget?: string;
  createdAt?: string;
  status?: string;
}): boolean {
  if (job.status === 'Selesai' || job.status === 'Dibatalkan') {
    return true;
  }

  const today = getJakartaDateString();
  const jobDate = job.date ? job.date.split('T')[0] : (job.createdAt ? job.createdAt.split('T')[0] : today);

  // 1. If job date is before today, it is expired
  if (jobDate < today) {
    return true;
  }

  // 2. If job date is today, check if timeTarget has an end time that has passed
  if (jobDate === today && job.timeTarget) {
    const raw = job.timeTarget.toLowerCase().replace(/wib/g, '').trim();
    // Look for end time patterns like "13:00 - 15:30" or "sampai 15:30" or "15:30"
    const timeMatches = raw.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g);
    if (timeMatches && timeMatches.length > 0) {
      // Pick the last matched time as the deadline
      const deadlineStr = timeMatches[timeMatches.length - 1];
      const [endHourStr, endMinStr] = deadlineStr.split(':');
      const endHour = parseInt(endHourStr, 10);
      const endMin = parseInt(endMinStr, 10);

      const currentHour = getJakartaHour();
      const currentMin = getJakartaMinute();

      const currentTotalMin = currentHour * 60 + currentMin;
      const endTotalMin = endHour * 60 + endMin;

      if (currentTotalMin > endTotalMin) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Normalizes any date input (string, Date, timestamp) into YYYY-MM-DD format.
 * Handles DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, ISO timestamps, and Date objects.
 */
export function normalizeDateString(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  if (dateInput instanceof Date) {
    return getJakartaDateString(dateInput);
  }
  const s = String(dateInput).trim();
  if (!s) return '';

  // If ISO string like 2026-08-28T...
  if (s.includes('T')) {
    return s.split('T')[0];
  }

  // If slash separated (e.g. 28/08/2026 or 2026/08/28 or 8/28/2026)
  if (s.includes('/')) {
    const parts = s.split('/').map((p) => p.trim());
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        // DD/MM/YYYY or MM/DD/YYYY -> DD/MM/YYYY
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else if (parts[0].length === 4) {
        // YYYY/MM/DD
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
    }
  }

  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }

  // If DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    const parts = s.split('-');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
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

