import { apiDownload, apiRequest, notifyUnauthorized } from '../../../shared/lib/api';

const DEFAULT_BACKEND_BASE_URL = '';

const REVISI_API_ENDPOINTS = {
  myRequest: String(import.meta.env.VITE_API_REVISI_MY_REQUEST_JSON_ENDPOINT || '/api/revisi/requests').trim(),
  processRequest: String(import.meta.env.VITE_API_REVISI_PROCESS_REQUEST_JSON_ENDPOINT || '/api/revisi/process-requests').trim(),
  requestReport: String(import.meta.env.VITE_API_REVISI_REQUEST_REPORT_JSON_ENDPOINT || '/api/revisi/reports').trim(),
  collectData: String(import.meta.env.VITE_API_REVISI_COLLECT_DATA_ENDPOINT || '/api/revisi/collect-data').trim(),
  dataPengguna: String(import.meta.env.VITE_API_REVISI_DATA_PENGGUNA_ENDPOINT || '/api/revisi/users').trim(),
  reportDownload: String(import.meta.env.VITE_API_REVISI_REPORT_DOWNLOAD_ENDPOINT || '/api/revisi/reports/download').trim(),
  createRequestMeta: String(import.meta.env.VITE_API_REVISI_CREATE_REQUEST_META_ENDPOINT || '/api/revisi/create-request/meta').trim(),
  createRequest: String(import.meta.env.VITE_API_REVISI_CREATE_REQUEST_ENDPOINT || '/api/revisi/requests').trim(),
  requestDetail: String(import.meta.env.VITE_API_REVISI_REQUEST_DETAIL_ENDPOINT || '/api/revisi/requests').trim(),
  requestMutation: String(import.meta.env.VITE_API_REVISI_REQUEST_MUTATION_ENDPOINT || '/api/revisi/requests').trim(),
  processRequestAction: String(import.meta.env.VITE_API_REVISI_PROCESS_REQUEST_ACTION_ENDPOINT || '/api/revisi/process-requests').trim()
};

const BACKEND_BASE_URL = String(import.meta.env.VITE_BACKEND_BASE_URL ?? DEFAULT_BACKEND_BASE_URL)
  .trim()
  .replace(/\/+$/, '');
const DEFAULT_CREATE_REQUEST_TYPES = [
  'Cataloging',
  'Perubahan Data MRP (MRP Type/Strategi Stok)',
  'Perubahan Data MRP (Min-Max)',
  'Perubahan PO Text/Spesifikasi',
  'Deletion/Undeletion Flag',
  'Konsolidasi Duplikasi',
  'Generalisasi OEM',
  'Lain-Lain'
];
const CREATE_REQUEST_TEMPLATE_MAP = {
  'Perubahan Data MRP (MRP Type/Strategi Stok)': {
    href: '/legacy-files/templatedokumenshp.xlsx',
    download: 'templatedokumenshp.xlsx',
    label: 'Unduh Template Dokumen SHP'
  },
  'Perubahan Data MRP (Min-Max)': {
    href: '/legacy-files/templatedokumenkalkulators tok.xlsx',
    download: 'templatedokumenkalkulatorstok.xlsx',
    label: 'Unduh Template Dokumen Kalkulator Stok'
  }
};

function withQuery(path, query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

function normalizeBackendPath(path) {
  if (!path) {
    return '/';
  }

  const value = String(path).trim();
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  return value.startsWith('/') ? value : `/${value}`;
}

function normalizeApiEndpointPath(path) {
  const value = String(path || '').trim();
  if (!value) {
    return '';
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  if (value === '/api') {
    return '/';
  }

  return value.replace(/^\/api(?=\/)/i, '') || '/';
}

function buildBackendUrl(path, query = {}) {
  const normalizedPath = normalizeBackendPath(path);
  if (normalizedPath.startsWith('http://') || normalizedPath.startsWith('https://')) {
    return withQuery(normalizedPath, query);
  }

  const base = BACKEND_BASE_URL || '';
  return withQuery(base ? `${base}${normalizedPath}` : normalizedPath, query);
}

function encodeLegacyFilePath(value = '') {
  return String(value || '')
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export function getLegacyFileUrl(filePath = '') {
  const value = String(filePath || '').trim();
  if (!value) {
    return '';
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  if (value.startsWith('/legacy-files/')) {
    return buildBackendUrl(value);
  }

  if (value.startsWith('/')) {
    return buildBackendUrl(value);
  }

  return buildBackendUrl(`/legacy-files/${encodeLegacyFilePath(value)}`);
}

function normalizeLegacyActionUrl(url = '') {
  const value = String(url || '').trim();
  if (!value) {
    return '';
  }

  const normalizePathname = (pathname = '') => {
    const cleanPath = String(pathname || '').trim();
    const pathMap = {
      '/proses': '/proses.php',
      '/detailpermintaan': '/detailpermintaan.php',
      '/detail_permintaan': '/detail_permintaan.php',
      '/ubahpermintaan': '/ubahpermintaan.php',
      '/delete_permintaan': '/delete_permintaan.php'
    };
    return pathMap[cleanPath] || cleanPath;
  };

  if (!value.startsWith('http://') && !value.startsWith('https://')) {
    try {
      const parsed = new URL(value, window.location.origin);
      return `${normalizePathname(parsed.pathname)}${parsed.search}${parsed.hash}`;
    } catch {
      return value;
    }
  }

  try {
    const parsed = new URL(value);
    if (parsed.pathname.startsWith('/')) {
      return `${normalizePathname(parsed.pathname)}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return value;
  }

  return value;
}

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function extractValue(doc, selector) {
  return doc.querySelector(selector)?.getAttribute('value')
    ?? doc.querySelector(selector)?.value
    ?? '';
}

function extractOptions(doc, selector) {
  return Array.from(doc.querySelectorAll(`${selector} option`))
    .map((option) => ({
      value: option.getAttribute('value') || '',
      label: option.textContent?.trim() || ''
    }))
    .filter((option) => option.value);
}

function extractSelectOptions(selectElement) {
  if (!selectElement) {
    return [];
  }

  return Array.from(selectElement.querySelectorAll('option'))
    .map((option) => ({
      value: String(option.getAttribute('value') || option.textContent || '').trim(),
      label: String(option.textContent || '').trim()
    }))
    .filter((option) => option.value && !/^--\s*pilih/i.test(option.label));
}

function _parseCreateRequestPageHtml(html = '') {
  const fallbackTypes = DEFAULT_CREATE_REQUEST_TYPES.map((item) => ({
    value: item,
    label: item
  }));

  if (!html || typeof DOMParser === 'undefined') {
    return {
      csrfToken: '',
      tanggalPermintaan: getTodayDateString(),
      nama: '',
      username: '',
      unitkerja: '',
      jenisPermintaanOptions: fallbackTypes,
      stafOptions: [],
      requiresDiprosesOleh: false,
      templateMap: {}
    };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const errorMessage = doc.querySelector('.alert-danger')?.textContent?.trim() || '';
  const requiresDiprosesOleh = Boolean(doc.querySelector('#diprosesoleh'));
  const templateMap = Object.fromEntries(
    Object.entries(CREATE_REQUEST_TEMPLATE_MAP).map(([key, value]) => [
      key,
      {
        ...value,
        href: buildBackendUrl(value.href)
      }
    ])
  );

  return {
      csrfToken: extractValue(doc, 'input[name="_token"]'),
      tanggalPermintaan: extractValue(doc, 'input[name="tanggal_permintaan"]') || getTodayDateString(),
      nama: extractValue(doc, 'input[name="nama"]'),
      username: extractValue(doc, 'input[name="username"]'),
      unitkerja: extractValue(doc, 'input[name="unitkerja"]'),
      jenisPermintaanOptions: extractOptions(doc, '#jenispermintaan').length
        ? extractOptions(doc, '#jenispermintaan')
        : fallbackTypes,
      stafOptions: extractOptions(doc, '#diprosesoleh'),
      requiresDiprosesOleh,
      templateMap,
    errorMessage
  };
}

function _parseCreateRequestErrorHtml(html = '') {
  if (!html || typeof DOMParser === 'undefined') {
    return '';
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return doc.querySelector('.alert-danger')?.textContent?.trim() || '';
}

function parseReadonlyRequestFormHtml(html = '') {
  if (!html || typeof DOMParser === 'undefined') {
    return {};
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const result = {
    csrfToken: extractValue(doc, 'input[name="_token"]')
  };

  const labelMap = {
    'kode permintaan': 'kodepermintaan',
    'tanggal permintaan': 'tanggalpermintaan',
    nama: 'nama',
    'nomor badge': 'username',
    'unit kerja': 'unitkerja',
    'jenis permintaan': 'jenispermintaan',
    'material code': 'materialcode',
    'detail permintaan': 'detailpermintaan',
    status: 'status',
    'diapproval oleh': 'diapprovaloleh',
    'approval terakhir': 'approval',
    'catatan approval terakhir': 'catatan',
    'tanggal approval terakhir': 'tanggalapproval',
    'diproses oleh': 'diprosesoleh',
    'keterangan proses': 'keterangan',
    'tanggal selesai': 'tanggalproses',
    'dokumen referensi': 'documents',
    'tanggal approval': 'tanggalapproval',
    'catatan approval': 'catatan'
  };

  const groups = Array.from(doc.querySelectorAll('.form-group'));
  groups.forEach((group) => {
    const labelText = group.querySelector('label')?.textContent
      ?.replace(/\*/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    if (!labelText) {
      return;
    }

    const key = labelMap[labelText];
    if (!key) {
      return;
    }

    if (key === 'documents') {
      const links = Array.from(group.querySelectorAll('a'))
        .map((anchor) => anchor.textContent?.trim() || '')
        .filter(Boolean);
      result.documents = links;
      return;
    }

    const input = group.querySelector('input, textarea, select');
    if (!input) {
      return;
    }

    if (input.tagName === 'TEXTAREA') {
      result[key] = input.textContent || input.value || input.innerHTML || '';
      return;
    }

    if (input.tagName === 'SELECT') {
      if (key === 'diprosesoleh') {
        result.stafOptions = extractSelectOptions(input).map((option) => option.value || option.label);
      }
      result[key] = input.value
        || input.selectedOptions?.[0]?.textContent?.trim()
        || input.getAttribute('value')
        || '';
      return;
    }

    result[key] = input.value || input.getAttribute('value') || input.textContent || '';
  });

  return result;
}

function getAuthHeaders(extraHeaders = {}) {
  return {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...extraHeaders
  };
}

async function requestAbsolute(url, options = {}) {
  const { headers, body, ...restOptions } = options;
  const response = await fetch(url, {
    ...restOptions,
    credentials: 'include',
    headers: getAuthHeaders(headers),
    body
  });

  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  const responseText = await response.text().catch(() => '');
  let responseJson = null;

  if (responseText && contentType.includes('application/json')) {
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      notifyUnauthorized();
    }

    const fallbackMessage = `Request gagal (${response.status} ${response.statusText})`;
    const errorMessage = response.status === 401
      ? 'Sesi login Anda sudah berakhir. Silakan login kembali.'
      : (responseJson?.message || responseText?.trim() || fallbackMessage);

    const error = new Error(errorMessage);
    error.status = response.status;
    error.payload = responseJson || responseText;
    throw error;
  }

  if (contentType.includes('application/json')) {
    if (responseJson) {
      return responseJson;
    }
    if (!responseText) {
      return null;
    }
  }

  if (!responseText) {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return {
      html: responseText,
      text: responseText
    };
  }
}

async function requestJsonEndpoint(path, options = {}) {
  const normalizedPath = normalizeApiEndpointPath(path);
  if (!normalizedPath) {
    return null;
  }

  if (normalizedPath.startsWith('http://') || normalizedPath.startsWith('https://')) {
    return requestAbsolute(normalizedPath, options);
  }

  return apiRequest(normalizedPath, options);
}

function pickRowLink(row, keys = []) {
  for (const key of keys) {
    if (row?.links?.[key]) {
      return row.links[key];
    }
    if (row?.[key]) {
      return row[key];
    }
  }
  return '';
}

function _buildDeleteCandidates(row, username) {
  const id = Number(row?.id || 0);
  if (!id) {
    return [];
  }

  const payload = { id, username };
  const candidates = [];

  const rowDeleteLink = pickRowLink(row, ['delete', 'delete_url', 'hapus_url']);
  if (rowDeleteLink) {
    if (String(rowDeleteLink).startsWith('/api/')) {
      candidates.push({
        kind: 'api',
        method: 'DELETE',
        path: rowDeleteLink,
        payload
      });
      candidates.push({
        kind: 'api',
        method: 'POST',
        path: rowDeleteLink,
        payload
      });
    } else {
      candidates.push({
        kind: 'absolute',
        method: 'POST',
        url: buildBackendUrl(rowDeleteLink),
        payload
      });
    }
  }

  candidates.push({
    kind: 'api',
    method: 'DELETE',
    path: `${API_ENDPOINTS.myRequest}/${id}`,
    payload
  });

  const deleteApiTemplate = import.meta.env.VITE_API_MY_REQUEST_DELETE_ENDPOINT || `${API_ENDPOINTS.myRequest}/delete`;
  candidates.push({
    kind: 'api',
    method: 'POST',
    path: deleteApiTemplate.includes(':id') ? deleteApiTemplate.replace(':id', String(id)) : deleteApiTemplate,
    payload
  });

  candidates.push({
    kind: 'absolute',
    method: 'POST',
    url: buildBackendUrl('/delete_permintaan.php'),
    payload
  });

  return candidates;
}

function parseNumericIdFromHref(href = '') {
  try {
    const parsed = new URL(href, window.location.origin);
    const idValue = parsed.searchParams.get('id');
    const parsedId = Number(idValue || 0);
    return Number.isFinite(parsedId) && parsedId > 0 ? parsedId : null;
  } catch {
    return null;
  }
}

function parseDocumentsFromCell(cell, baseUrl = window.location.origin) {
  const links = Array.from(cell.querySelectorAll('a'));
  if (!links.length) {
    const text = cell.textContent?.trim();
    return text && text !== '-' ? [text] : [];
  }
  return links.map((anchor) => {
    const href = anchor.getAttribute('href') || anchor.href || '';
    const text = anchor.textContent?.trim() || href;
    const absoluteHref = href ? new URL(href, baseUrl).href : text;
    return {
      name: text,
      href: absoluteHref
    };
  });
}

function parseActionCell(cell, baseUrl = window.location.origin) {
  const links = Array.from(cell.querySelectorAll('a'));
  const buttons = Array.from(cell.querySelectorAll('button'));

  const actions = {};
  let id = null;
  let deleteUrl = '';

  links.forEach((anchor) => {
    const label = (anchor.textContent || '').trim().toLowerCase();
    const hrefRaw = anchor.getAttribute('href') || anchor.href || '';
    const href = hrefRaw ? new URL(hrefRaw, baseUrl).href : '';
    const parsedId = parseNumericIdFromHref(href);
    if (!id && parsedId) {
      id = parsedId;
    }

    if (label === 'detail') {
      actions.detail = href;
    }
    if (label === 'detail revisi') {
      actions.detailRevisi = href;
      actions.detail_revisi = href;
    }
    if (label === 'edit') {
      actions.edit = href;
    }
    if (label === 'revisi') {
      actions.revisi = href;
    }
    if (label === 'process') {
      actions.process = href;
      actions.proses_url = href;
    }
  });

  buttons.forEach((button) => {
    const dataId = Number(button.getAttribute('data-id') || 0);
    if (!id && Number.isFinite(dataId) && dataId > 0) {
      id = dataId;
    }
    if ((button.textContent || '').toLowerCase().includes('hapus')) {
      deleteUrl = buildBackendUrl('/delete_permintaan.php');
    }
  });

  if (deleteUrl) {
    actions.delete = deleteUrl;
    actions.delete_url = deleteUrl;
  }

  return { id, actions };
}

function parseHtmlRows(html) {
  const parser = new DOMParser();
  const wrappedDoc = parser.parseFromString(`<table><tbody>${html}</tbody></table>`, 'text/html');
  let rows = Array.from(wrappedDoc.querySelectorAll('tbody tr'));

  if (rows.length) {
    return rows;
  }

  const directDoc = parser.parseFromString(html, 'text/html');
  rows = Array.from(directDoc.querySelectorAll('tr'));
  return rows;
}

function _parseLegacyMyRequestResponse(response) {
  if (!response || typeof response !== 'object' || typeof response.html !== 'string') {
    return response;
  }

  if (typeof DOMParser === 'undefined') {
    return {
      data: [],
      meta: {
        info: response.info || '',
        total: Number(response.total || 0)
      },
      total: Number(response.total || 0)
    };
  }

  const trs = parseHtmlRows(response.html);
  const baseUrl = BACKEND_BASE_URL || window.location.origin;

  const data = trs
    .map((tr) => {
      const tds = Array.from(tr.querySelectorAll('td'));
      if (tds.length < 10) {
        return null;
      }

      const documents = parseDocumentsFromCell(tds[6], baseUrl);
      const actionParsed = parseActionCell(tds[9], baseUrl);

      const row = {
        id: actionParsed.id,
        kodepermintaan: tds[1].textContent?.trim() || '-',
        tanggalpermintaan: tds[2].textContent?.trim() || '-',
        jenispermintaan: tds[3].textContent?.trim() || '-',
        materialcode: tds[4].textContent?.trim() || '-',
        detailpermintaan: tds[5].innerHTML?.trim() || '-',
        documents: documents.map((docItem) => (typeof docItem === 'string' ? docItem : docItem.name)),
        tanggalproses: tds[7].textContent?.trim() || '-',
        status: tds[8].textContent?.trim() || '-',
        links: actionParsed.actions
      };

      documents.forEach((docItem, index) => {
        if (typeof docItem !== 'string' && index < 10) {
          row[`dokumentambahan${index + 1}`] = docItem.href;
        }
      });

      if (actionParsed.actions.delete) {
        row.delete_url = actionParsed.actions.delete;
      }
      return row;
    })
    .filter(Boolean);

  const total = Number(response.total || data.length || 0);
  return {
    data,
    total,
    meta: {
      info: response.info || '',
      total,
      source: 'legacy'
    }
  };
}

function _parseLegacyProcessRequestResponse(response) {
  if (!response || typeof response !== 'object' || typeof response.html !== 'string') {
    return response;
  }

  if (typeof DOMParser === 'undefined') {
    return {
      data: [],
      meta: {
        info: response.info || '',
        total: Number(response.total || 0)
      },
      total: Number(response.total || 0)
    };
  }

  const trs = parseHtmlRows(response.html);
  const baseUrl = BACKEND_BASE_URL || window.location.origin;

  const data = trs
    .map((tr) => {
      const tds = Array.from(tr.querySelectorAll('td'));
      if (tds.length < 13) {
        return null;
      }

      const documents = parseDocumentsFromCell(tds[8], baseUrl);
      const actionParsed = parseActionCell(tds[12], baseUrl);

      const row = {
        id: actionParsed.id,
        kodepermintaan: tds[1].textContent?.trim() || '-',
        tanggalpermintaan: tds[2].textContent?.trim() || '-',
        nama: tds[3].textContent?.trim() || '-',
        username: tds[4].textContent?.trim() || '-',
        jenispermintaan: tds[5].textContent?.trim() || '-',
        materialcode: tds[6].textContent?.trim() || '-',
        detailpermintaan: tds[7].innerHTML?.trim() || '-',
        documents: documents.map((docItem) => (typeof docItem === 'string' ? docItem : docItem.name)),
        catatan: tds[9].innerHTML?.trim() || '-',
        tanggalproses: tds[10].textContent?.trim() || '-',
        status: tds[11].textContent?.trim() || '-',
        links: actionParsed.actions
      };

      documents.forEach((docItem, index) => {
        if (typeof docItem !== 'string' && index < 10) {
          row[`dokumentambahan${index + 1}`] = docItem.href;
        }
      });

      return row;
    })
    .filter(Boolean);

  const total = Number(response.total || data.length || 0);
  return {
    data,
    total,
    meta: {
      info: response.info || '',
      total,
      source: 'legacy'
    }
  };
}

function _parseLegacyReportResponse(response) {
  if (!response || typeof response !== 'object' || typeof response.html !== 'string') {
    return response;
  }

  if (typeof DOMParser === 'undefined') {
    return {
      data: [],
      meta: {
        info: response.info || '',
        total: Number(response.total || 0)
      },
      total: Number(response.total || 0),
      html: response.html
    };
  }

  const trs = parseHtmlRows(response.html);
  const data = trs
    .map((tr, index) => {
      const tds = Array.from(tr.querySelectorAll('td'));
      if (tds.length < 5) {
        return null;
      }

      return {
        id: tds[0].textContent?.trim() || `report-${index}`,
        periode: tds[0].textContent?.trim() || '-',
        triwulan: tds[1].textContent?.trim() || '-',
        jumlah_permintaan: tds[2].textContent?.trim() || '0',
        jumlah_selesai: tds[3].textContent?.trim() || '0',
        presentase: tds[4].textContent?.trim() || '0'
      };
    })
    .filter(Boolean);

  const total = Number(response.total || data.length || 0);
  return {
    data,
    total,
    meta: {
      info: response.info || '',
      total,
      source: 'legacy'
    },
    html: response.html
  };
}

function _parseLegacyDataPenggunaResponse(response) {
  if (response && typeof response === 'object' && Array.isArray(response.data)) {
    return response;
  }

  const html = typeof response === 'string'
    ? response
    : response?.html || response?.text || '';

  if (!html || typeof DOMParser === 'undefined') {
    return {
      data: [],
      meta: {
        total: 0,
        source: 'legacy'
      }
    };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const rows = Array.from(doc.querySelectorAll('#usersTable tbody tr'));

  const data = rows
    .map((row) => {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length < 6) {
        return null;
      }

      const username = cells[2].textContent?.trim() || '';
      const nama = cells[1].textContent?.trim() || '';
      const role = cells[3].textContent?.trim() || '';
      const unitkerja = cells[4].textContent?.trim() || '';
      const kode = cells[5].textContent?.trim() || '';

      if (!username && !nama) {
        return null;
      }

      return {
        nama,
        username,
        role,
        unitkerja,
        kode
      };
    })
    .filter(Boolean);

  return {
    data,
    total: data.length,
    meta: {
      total: data.length,
      source: 'legacy'
    }
  };
}

export function getMyRequests(query = {}) {
  return requestJsonEndpoint(withQuery(REVISI_API_ENDPOINTS.myRequest, query));
}

export function getProcessRequests(query = {}) {
  return requestJsonEndpoint(withQuery(REVISI_API_ENDPOINTS.processRequest, query));
}

export async function getRequestReports(query = {}) {
  const response = await requestJsonEndpoint(withQuery(REVISI_API_ENDPOINTS.requestReport, query));
  return response?.data
    ? response
    : {
      data: Array.isArray(response) ? response : [],
      meta: response?.meta || {}
    };
}

export function getCollectData(query = {}) {
  return requestJsonEndpoint(withQuery(REVISI_API_ENDPOINTS.collectData, query));
}

function escapeCollectDataHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getCollectDataExportTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

function toCollectDataLegacyExcelHtml(rows = []) {
  const headers = [
    'No',
    'Kode Permintaan',
    'Tanggal Permintaan',
    'Nama Requester',
    'Nomor Badge',
    'Jenis Permintaan',
    'Material Code',
    'Detail Permintaan',
    'Dokumen Referensi',
    'Catatan Approval',
    'Tanggal Selesai',
    'Status'
  ];

  const tableHead = headers.map((header) => `<th>${escapeCollectDataHtml(header)}</th>`).join('');
  const tableBody = rows.map((row, index) => {
    const values = [
      index + 1,
      row.kodepermintaan ?? '',
      row.tanggalpermintaan ?? '',
      row.nama ?? '',
      row.nomorbadge ?? row.username ?? '',
      row.jenispermintaan ?? '',
      row.materialcode ?? '',
      row.detailpermintaan ?? '',
      row.dokumenreferensi ?? row.documentsText ?? '-',
      row.catatanapproval ?? row.catatan ?? '-',
      row.tanggalselesai ?? row.tanggalproses ?? '-',
      row.status ?? ''
    ];

    return `<tr>${values.map((value) => `<td>${escapeCollectDataHtml(value)}</td>`).join('')}</tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
</head>
<body>
  <table border="1">
    <thead>
      <tr>${tableHead}</tr>
    </thead>
    <tbody>
      ${tableBody}
    </tbody>
  </table>
</body>
</html>`;
}

export async function exportCollectDataExcel(query = {}) {
  const response = await getCollectData(query);
  if (response?.meta?.endpointReady === false) {
    throw new Error(response?.meta?.message || 'Endpoint Collect Data belum siap.');
  }
  const rows = Array.isArray(response?.data) ? response.data : [];

  const content = toCollectDataLegacyExcelHtml(rows);
  const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Data_Permintaan_${getCollectDataExportTimestamp()}.xls`;
  link.click();
  URL.revokeObjectURL(url);

  return {
    count: rows.length
  };
}

export async function getDataPengguna(query = {}) {
  const response = await requestJsonEndpoint(withQuery(REVISI_API_ENDPOINTS.dataPengguna, query));
  return response?.data
    ? response
    : {
      data: Array.isArray(response) ? response : [],
      meta: response?.meta || {}
    };
}

export async function getDataPenggunaDetail(username = '') {
  const value = String(username || '').trim();
  if (!value) {
    throw new Error('Username pengguna tidak tersedia.');
  }

  const response = await requestJsonEndpoint(`${REVISI_API_ENDPOINTS.dataPengguna}/${encodeURIComponent(value)}`);
  return response?.data || response || {};
}

export async function createDataPengguna(payload = {}) {
  const response = await requestJsonEndpoint(REVISI_API_ENDPOINTS.dataPengguna, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return response?.data
    ? response
    : {
      data: response || {},
      message: response?.message || 'Pengguna berhasil ditambahkan.'
    };
}

export async function updateDataPengguna(username = '', payload = {}) {
  const value = String(username || '').trim();
  if (!value) {
    throw new Error('Username pengguna tidak tersedia.');
  }

  const response = await requestJsonEndpoint(`${REVISI_API_ENDPOINTS.dataPengguna}/${encodeURIComponent(value)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return response?.data
    ? response
    : {
      data: response || {},
      message: response?.message || 'Pengguna berhasil diperbarui.'
    };
}

export async function deleteDataPengguna(username = '') {
  const value = String(username || '').trim();
  if (!value) {
    throw new Error('Username pengguna tidak tersedia.');
  }

  return requestJsonEndpoint(`${REVISI_API_ENDPOINTS.dataPengguna}/${encodeURIComponent(value)}`, {
    method: 'DELETE'
  });
}

export function getMyRequestActionUrls(row) {
  const id = Number(row?.id || 0);
  return {
    detail: pickRowLink(row, ['detail', 'detail_url']) || (id ? buildBackendUrl('/detailpermintaan.php', { id }) : ''),
    detailRevisi: pickRowLink(row, ['detailRevisi', 'detail_revisi']) || (id ? buildBackendUrl('/detailpermintaan.php', { id, view: 'revisi' }) : ''),
    edit: pickRowLink(row, ['edit', 'edit_url']) || '',
    revisi: pickRowLink(row, ['revisi', 'revisi_url']) || ''
  };
}

export function getProcessRequestActionUrls(row) {
  const id = Number(row?.id || 0);
  return {
    detail: pickRowLink(row, ['detail', 'detail_url']) || (id ? buildBackendUrl('/detail_permintaan.php', { id }) : ''),
    process: pickRowLink(row, ['process', 'process_url', 'proses_url']) || (id ? buildBackendUrl('/proses.php', { id }) : '')
  };
}

function extractDownloadFilename(contentDisposition = '', fallbackName = 'Laporan_Permintaan.xls') {
  const value = String(contentDisposition || '');
  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = value.match(/filename="?([^"]+)"?/i);
  if (plainMatch?.[1]) {
    return plainMatch[1];
  }

  return fallbackName;
}

export async function downloadRequestReport(query = {}) {
  if (!REVISI_API_ENDPOINTS.reportDownload) {
    throw new Error('Endpoint download report belum tersedia.');
  }

  const path = withQuery(REVISI_API_ENDPOINTS.reportDownload, query);
  const response = await apiDownload(path);
  const blob = response.data;
  const filename = extractDownloadFilename(
    response.headers?.['content-disposition'],
    'Laporan_Permintaan.xls'
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);

  return {
    success: true,
    filename
  };
}

export async function getRequestDetail(id, _fallbackUrl = '') {
  const requestId = Number(id || 0);
  if (!requestId || !REVISI_API_ENDPOINTS.requestDetail) {
    throw new Error('Detail request tidak tersedia.');
  }

  const response = await requestJsonEndpoint(`${REVISI_API_ENDPOINTS.requestDetail}/${requestId}`);
  return response?.data || response || {};
}

export async function getRequestDetailFromLegacy(actionUrl = '') {
  if (!actionUrl) {
    return {};
  }

  const response = await requestAbsolute(normalizeLegacyActionUrl(actionUrl), {
    method: 'GET'
  });

  const html = typeof response === 'string'
    ? response
    : response?.html || response?.text || '';

  return parseReadonlyRequestFormHtml(html);
}

async function _submitLegacyProcessRequestAction(actionUrl = '', payload = {}) {
  const normalizedUrl = normalizeLegacyActionUrl(actionUrl);
  if (!normalizedUrl) {
    throw new Error('URL proses request tidak tersedia.');
  }

  const formData = new FormData();
  formData.append('_token', String(payload.csrfToken || ''));
  formData.append('approval', String(payload.approval || ''));
  formData.append('catatan', String(payload.catatan || ''));
  formData.append('keterangan', String(payload.keterangan || ''));
  formData.append('diprosesoleh', String(payload.diprosesoleh || ''));

  const response = await fetch(normalizedUrl, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json, text/html,application/xhtml+xml',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: formData,
    redirect: 'follow'
  });

  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  const payloadText = await response.text().catch(() => '');

  let json = null;
  if (contentType.includes('application/json')) {
    try {
      json = JSON.parse(payloadText || '{}');
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    throw new Error(
      json?.message
      || payloadText?.trim()
      || `Request gagal (${response.status} ${response.statusText})`
    );
  }

  if (json?.success === false) {
    throw new Error(json?.message || 'Gagal memproses request.');
  }

  return {
    success: true,
    redirectTo: json?.redirectTo || '/butuhproses',
    message: json?.message || ''
  };
}

export async function submitProcessRequestActionById(id, payload = {}, _fallbackUrl = '') {
  const requestId = Number(id || 0);
  if (!requestId || !REVISI_API_ENDPOINTS.processRequestAction) {
    throw new Error('Proses request tidak tersedia.');
  }

  const response = await requestJsonEndpoint(`${REVISI_API_ENDPOINTS.processRequestAction}/${requestId}/actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      approval: String(payload.approval || ''),
      catatan: String(payload.catatan || ''),
      keterangan: String(payload.keterangan || ''),
      diprosesoleh: String(payload.diprosesoleh || '')
    })
  });

  return response?.data || response || {
    success: true,
    redirectTo: '/butuhproses',
    message: ''
  };
}

export async function getCreateRequestMeta() {
  const response = await requestJsonEndpoint(REVISI_API_ENDPOINTS.createRequestMeta);
  return response?.data || response || {};
}

export async function submitCreateRequest(payload = {}) {
  const formData = new FormData();
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (Array.isArray(value) || value instanceof File) {
      return;
    }
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });

  const documents = Array.isArray(payload.documents) ? payload.documents.slice(0, 10) : [];
  documents.forEach((documentItem, index) => {
    const slot = index + 1;
    if (documentItem?.file) {
      formData.append(`dokumentambahan${slot}`, documentItem.file);
    }
    formData.append(`dokumentambahan_nama${slot}`, String(documentItem?.name || '').trim());
  });

  return requestJsonEndpoint(REVISI_API_ENDPOINTS.createRequest, {
    method: 'POST',
    body: formData
  });
}

export async function updateMyRequestById(id, payload = {}) {
  const requestId = Number(id || 0);
  if (!requestId) {
    throw new Error('ID permintaan tidak valid.');
  }

  if (!REVISI_API_ENDPOINTS.requestMutation) {
    throw new Error('Endpoint update request belum tersedia.');
  }

  const formData = new FormData();
  formData.append('_method', 'PUT');
  formData.append('jenispermintaan', String(payload.jenispermintaan || ''));
  formData.append('materialcode', String(payload.materialcode || ''));
  formData.append('detailpermintaan', String(payload.detailpermintaan || ''));
  formData.append('diprosesoleh', String(payload.diprosesoleh || ''));

  const documents = Array.isArray(payload.documents) ? payload.documents.slice(0, 10) : [];
  documents.forEach((documentItem, index) => {
    const slot = index + 1;
    if (documentItem?.existing) {
      formData.append(`document_existing_${slot}`, String(documentItem.existing));
    }
    formData.append(`document_name_${slot}`, String(documentItem?.name || '').trim());
    if (documentItem?.file instanceof File) {
      formData.append(`document_file_${slot}`, documentItem.file);
    }
  });

  const response = await requestJsonEndpoint(`${REVISI_API_ENDPOINTS.requestMutation}/${requestId}`, {
    method: 'POST',
    body: formData
  });

  return response?.data
    ? response
    : {
      data: response || {},
      message: response?.message || 'Request berhasil diperbarui.'
    };
}

export async function deleteMyRequest(row, _user = {}) {
  const id = Number(row?.id || 0);
  if (!id) {
    throw new Error('ID permintaan tidak valid.');
  }

  if (!REVISI_API_ENDPOINTS.requestMutation) {
    throw new Error('Endpoint hapus request belum tersedia.');
  }

  const response = await requestJsonEndpoint(`${REVISI_API_ENDPOINTS.requestMutation}/${id}`, {
    method: 'DELETE'
  });

  if (response?.success === false) {
    throw new Error(response.message || 'Gagal menghapus permintaan.');
  }

  return response;
}

async function _requestList(path, query = {}, parser = null) {
  try {
    const normalizedPath = normalizeBackendPath(path);
    const useAbsoluteRequest = normalizedPath.startsWith('/revisi/')
      || normalizedPath.endsWith('.php')
      || normalizedPath.startsWith('/fetch');

    const response = useAbsoluteRequest
      ? await requestAbsolute(buildBackendUrl(path, query))
      : await requestJsonEndpoint(withQuery(path, query));

    if (parser && typeof parser === 'function') {
      return parser(response);
    }
    return response;
  } catch (error) {
    if (error?.status === 404 || !Number(error?.status)) {
      return {
        data: [],
        meta: {
          endpointReady: false,
          message: error?.status === 404
            ? `Endpoint API ${path} belum tersedia di backend Laravel.`
            : 'Backend Laravel belum bisa dijangkau dari React.'
        }
      };
    }
    throw error;
  }
}
