/**
 * Helper utility to process and convert Google Drive URLs
 * so they can be rendered directly in <img> tags and opened in new tabs.
 */

export function extractGoogleDriveFileId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;

  // Format: https://drive.google.com/file/d/FILE_ID/view...
  const matchFileD = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) return matchFileD[1];

  // Format: https://drive.google.com/open?id=FILE_ID or uc?id=FILE_ID or id=FILE_ID
  const matchIdParam = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchIdParam && matchIdParam[1]) return matchIdParam[1];

  // Format: https://lh3.googleusercontent.com/d/FILE_ID
  const matchLh3 = url.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (matchLh3 && matchLh3[1]) return matchLh3[1];

  return null;
}

/**
 * Converts a Google Drive link or generic image link into a direct streamable thumbnail URL
 * that renders reliably inside standard HTML <img> tags.
 */
export function formatGoogleDriveImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // If already base64 data URL or standard external image (e.g. unsplash), return as is
  if (trimmed.startsWith('data:image/') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  const fileId = extractGoogleDriveFileId(trimmed);
  if (fileId) {
    // googleusercontent direct thumbnail endpoint (high performance & CORS friendly)
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  return trimmed;
}

/**
 * Generates an openable Google Drive view link
 */
export function getGoogleDriveViewLink(url: string | undefined | null, defaultDriveFolderId?: string): string {
  if (!url) {
    return defaultDriveFolderId
      ? `https://drive.google.com/drive/folders/${defaultDriveFolderId}`
      : 'https://drive.google.com';
  }

  const fileId = extractGoogleDriveFileId(url);
  if (fileId) {
    return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return defaultDriveFolderId
    ? `https://drive.google.com/drive/folders/${defaultDriveFolderId}`
    : 'https://drive.google.com';
}
