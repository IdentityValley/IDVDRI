export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://idvdri.onrender.com';

export function apiUrl(path) {
  if (!path.startsWith('/')) return `${API_BASE_URL}/${path}`;
  return `${API_BASE_URL}${path}`;
}
