import axios from 'axios';

const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');
const SANCTUM_CSRF_URL = String(import.meta.env.VITE_SANCTUM_CSRF_ENDPOINT || '/sanctum/csrf-cookie').trim();
const UNAUTHORIZED_EVENT = 'matrifix:unauthorized';

function readCookie(name) {
  const escapedName = String(name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

function normalizeApiPath(path = '') {
  const value = String(path || '').trim();
  if (!value) {
    return '/';
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  return value.replace(/^\/+/, '');
}

export function notifyUnauthorized() {
  try {
    localStorage.removeItem('matrifix_user');
  } catch {
    // no-op
  }

  window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
}

export function getUnauthorizedEventName() {
  return UNAUTHORIZED_EVENT;
}

function normalizeResponseData(payload) {
  if (typeof payload !== 'string') {
    return payload;
  }

  const trimmedPayload = payload
    .replace(/^\uFEFF+/, '')
    .replace(/^[\u200B-\u200D\u2060]+/, '')
    .trim();

  if (!trimmedPayload) {
    return payload;
  }

  if (!/^[\[{]/.test(trimmedPayload)) {
    return payload;
  }

  try {
    return JSON.parse(trimmedPayload);
  } catch {
    return payload;
  }
}

function assertJsonLikeResponse(response, path) {
  const payload = response?.data;
  if (typeof payload !== 'string') {
    return;
  }

  const trimmedPayload = payload
    .replace(/^\uFEFF+/, '')
    .replace(/^[\u200B-\u200D\u2060]+/, '')
    .trim();

  if (!trimmedPayload || /^[\[{]/.test(trimmedPayload)) {
    return;
  }

  const contentType = String(response?.headers?.['content-type'] || '');
  const looksLikeHtml = contentType.includes('text/html') || /<\/?[a-z][\s\S]*>/i.test(trimmedPayload);
  const requestError = new Error(
    looksLikeHtml
      ? `Backend mengembalikan HTML untuk endpoint API ${path}. Pastikan route API Laravel aktif dan response-nya JSON.`
      : `Backend mengembalikan response non-JSON untuk endpoint API ${path}: ${trimmedPayload.slice(0, 120)}`,
  );
  requestError.status = response?.status || 200;
  requestError.payload = trimmedPayload;
  throw requestError;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

apiClient.interceptors.request.use((config) => {
  const method = String(config.method || 'get').toLowerCase();
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    const xsrfToken = readCookie('XSRF-TOKEN');
    if (xsrfToken) {
      config.headers = {
        ...config.headers,
        'X-XSRF-TOKEN': xsrfToken,
      };
    }
  }

  return config;
});

export async function ensureCsrfCookie() {
  await axios.get(SANCTUM_CSRF_URL, {
    withCredentials: true,
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
}

function toRequestError(error, fallback401 = 'Sesi login Anda sudah berakhir. Silakan login kembali.', notifyOnUnauthorized = true) {
  if (error?.response) {
    const { status, statusText, data } = error.response;
    if (status === 401 && notifyOnUnauthorized) {
      notifyUnauthorized();
    }
    const fallbackMessage = `Request gagal (${status} ${statusText})`;
    const requestError = new Error(
      status === 401 ? fallback401 : (data?.message || data?.error || fallbackMessage),
    );
    requestError.status = status;
    requestError.payload = data;
    return requestError;
  }

  const networkError = new Error('Backend Laravel belum bisa dijangkau dari React.');
  networkError.status = 0;
  networkError.payload = error;
  return networkError;
}

export async function apiRequest(path, options = {}) {
  const { headers, method = 'GET', body, data, skipUnauthorizedNotify = false, ...restOptions } = options;

  try {
    const response = await apiClient.request({
      url: normalizeApiPath(path),
      method,
      headers,
      data: data ?? body,
      ...restOptions,
    });

    assertJsonLikeResponse(response, path);
    return normalizeResponseData(response.data);
  } catch (error) {
    if (error?.payload && error?.status) {
      throw error;
    }
    throw toRequestError(error, 'Sesi login Anda sudah berakhir. Silakan login kembali.', !skipUnauthorizedNotify);
  }
}

export async function apiDownload(path, options = {}) {
  const { headers, method = 'GET', body, data, skipUnauthorizedNotify = false, ...restOptions } = options;

  try {
    return await apiClient.request({
      url: normalizeApiPath(path),
      method,
      responseType: 'blob',
      data: data ?? body,
      headers: {
        Accept: 'application/octet-stream, application/vnd.ms-excel, application/json',
        ...headers,
      },
      ...restOptions,
    });
  } catch (error) {
    throw toRequestError(error, 'Sesi login Anda sudah berakhir. Silakan login kembali.', !skipUnauthorizedNotify);
  }
}
