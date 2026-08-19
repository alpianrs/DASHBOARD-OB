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
