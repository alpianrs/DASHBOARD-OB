import { User } from '../types';
import { StorageService } from './storage';

// Google Sheets Token & Auth State (No Firebase)
let cachedAccessToken: string | null = null;

export const getCachedAccessToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;
  const config = StorageService.getSyncConfig();
  return config.sheetId || null;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const loginWithCredentials = (
  username: string,
  password: string,
  usersList: User[]
): { success: boolean; user?: User; message?: string } => {
  const cleanUsername = username.trim().toLowerCase();
  const cleanPassword = password.trim();

  const user = usersList.find(
    (u) => u.username.toLowerCase() === cleanUsername && u.status !== 'Resign' && (u.status as string) !== 'Nonaktif'
  );

  if (!user) {
    return {
      success: false,
      message: 'Username tidak ditemukan pada data Google Sheet atau akun berstatus Nonaktif.',
    };
  }

  // If password exists in Google Sheet, verify it. Default is 'password123' if blank in sheet
  const expectedPassword = user.password ? user.password.trim() : 'password123';
  if (cleanPassword && cleanPassword !== expectedPassword && expectedPassword !== '') {
    return {
      success: false,
      message: 'Password salah. Periksa data password di Google Sheet tab "Users".',
    };
  }

  StorageService.setActiveUser(user);
  return {
    success: true,
    user,
  };
};

export const logoutUser = () => {
  StorageService.clearActiveUser();
};

