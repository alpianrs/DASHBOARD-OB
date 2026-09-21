import { MASJID_ROLLING_AREAS, MasjidRollingArea, MasjidRollingSchedule } from '../types';
import { getJakartaDateString, normalizeDateString } from './dateHelper';

/**
 * Helper untuk mendapatkan tanggal hari Senin pada minggu dari tanggal yang diberikan (Format YYYY-MM-DD).
 * Waktu dihitung berdasarkan zona waktu Indonesia Barat (WIB).
 */
export function getMondayOfWeek(dateInput?: string | Date): string {
  const normalized = dateInput
    ? normalizeDateString(dateInput)
    : getJakartaDateString();
  
  const [yearStr, monthStr, dayStr] = normalized.split('-');
  const d = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
  
  const day = d.getDay(); // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
  const diffToMonday = day === 0 ? 6 : day - 1; // Jika Minggu mundur 6 hari, jika Senin mundur 0
  
  d.setDate(d.getDate() - diffToMonday);
  
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dateNum = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dateNum}`;
}

/**
 * Helper untuk mendapatkan tanggal hari Minggu pada minggu berjalan (Senin + 6 hari).
 */
export function getSundayOfWeek(mondayDateStr: string): string {
  const [yearStr, monthStr, dayStr] = mondayDateStr.split('-');
  const d = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
  d.setDate(d.getDate() + 6);
  
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dateNum = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dateNum}`;
}

/**
 * Format rentang tanggal Indonesia: "21 Sep 2026 - 27 Sep 2026"
 */
export function formatWeekRange(mondayDateStr: string): string {
  const sundayDateStr = getSundayOfWeek(mondayDateStr);
  const mParts = mondayDateStr.split('-');
  const sParts = sundayDateStr.split('-');
  
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des',
  ];
  
  const mDay = Number(mParts[2]);
  const mMonth = months[Number(mParts[1]) - 1];
  const mYear = mParts[0];

  const sDay = Number(sParts[2]);
  const sMonth = months[Number(sParts[1]) - 1];
  const sYear = sParts[0];

  if (mMonth === sMonth && mYear === sYear) {
    return `${mDay} - ${sDay} ${mMonth} ${mYear}`;
  }
  return `${mDay} ${mMonth} - ${sDay} ${sMonth} ${sYear}`;
}

/**
 * Menghitung jadwal giliran Piket Aula Masjid untuk minggu berjalan.
 * Aturan Penting Lazuardi GCS:
 * - 4 Area PLH yang berputar: Area Pos 2, Area Kolam Renang, Area Ex Minifarm, Area Khaldun.
 * - Area Pos 1 TIDAK IKUT (dikecualikan karena fokus penjagaan gerbang utama & pos depan).
 * - Reset otomatis setiap hari Senin jam 00:00 WIB.
 */
export function getMasjidRollingSchedule(dateInput?: string | Date): MasjidRollingSchedule {
  const monday = getMondayOfWeek(dateInput);
  
  // Referensi patokan Senin awal tahun 2026 (Senin, 5 Januari 2026)
  const refMonday = new Date(2026, 0, 5).getTime();
  const [y, m, d] = monday.split('-').map(Number);
  const currentMondayTime = new Date(y, m - 1, d).getTime();
  
  const msInWeek = 7 * 24 * 60 * 60 * 1000;
  const weekDiff = Math.floor((currentMondayTime - refMonday) / msInWeek);
  
  const activeIndex = ((weekDiff % 4) + 4) % 4;
  const nextIndex = (activeIndex + 1) % 4;
  
  return {
    weekMondayDate: monday,
    weekRangeText: formatWeekRange(monday),
    activeArea: MASJID_ROLLING_AREAS[activeIndex],
    nextArea: MASJID_ROLLING_AREAS[nextIndex],
    allCycle: [...MASJID_ROLLING_AREAS],
  };
}

/**
 * Cek apakah area tertentu mendapat giliran piket Aula Masjid pada minggu berjalan.
 */
export function isAreaOnMasjidDutyThisWeek(areaName: string, dateInput?: string | Date): boolean {
  if (!areaName) return false;
  const schedule = getMasjidRollingSchedule(dateInput);
  const cleanTarget = areaName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanActive = schedule.activeArea.toLowerCase().replace(/[^a-z0-9]/g, '');
  return cleanTarget.includes(cleanActive) || cleanActive.includes(cleanTarget);
}

/**
 * Mendapatkan proyeksi giliran 4 minggu ke depan.
 */
export function getMasjidRollingProjection(weeksCount = 4, startDateInput?: string | Date): {
  weekMondayDate: string;
  weekRangeText: string;
  area: MasjidRollingArea;
  isCurrentWeek: boolean;
}[] {
  const currentMonday = getMondayOfWeek(startDateInput);
  const [y, m, d] = currentMonday.split('-').map(Number);
  const results = [];

  for (let i = 0; i < weeksCount; i++) {
    const targetDate = new Date(y, m - 1, d + i * 7);
    const targetMonday = getMondayOfWeek(targetDate);
    const schedule = getMasjidRollingSchedule(targetMonday);
    results.push({
      weekMondayDate: targetMonday,
      weekRangeText: schedule.weekRangeText,
      area: schedule.activeArea,
      isCurrentWeek: i === 0,
    });
  }

  return results;
}
