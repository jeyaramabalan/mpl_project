/**
 * Same backend as mpl-frontend (VITE_API_URL). Override in .env: EXPO_PUBLIC_API_URL
 */
export const API_BASE_URL =
  (typeof process !== 'undefined' && process.env.EXPO_PUBLIC_API_URL) ||
  'https://mpl.supersalessoft.com/api';

/** Site origin for static assets (/images/...) — strip trailing /api from API base */
export const SITE_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');
