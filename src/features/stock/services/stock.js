import { apiRequest } from '../../../shared/lib/api';

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

function endpointNotReady(path, payload) {
  return {
    data: payload,
    meta: {
      endpointReady: false,
      message: `Endpoint API ${path} belum tersedia di backend Laravel.`
    }
  };
}

async function safeRequest(path, options = {}, fallbackData = []) {
  try {
    return await apiRequest(path, options);
  } catch (error) {
    if (error?.status === 404) {
      return endpointNotReady(path, fallbackData);
    }
    throw error;
  }
}

export async function getStockDashboardCounts() {
  const path = '/stock/dashboard-counts';
  const response = await safeRequest(path, {}, { Positif: 0, Negatif: 0, Balance: 0, Unknown: 0 });

  if (response?.meta?.endpointReady === false) {
    return response;
  }

  return {
    data: response?.counts || response?.data || { Positif: 0, Negatif: 0, Balance: 0, Unknown: 0 },
    meta: {
      endpointReady: true
    }
  };
}

export async function getMasterStockData(query = {}) {
  const path = withQuery('/stock/master-data', query);
  const response = await safeRequest(path, {}, []);

  if (response?.meta?.endpointReady === false) {
    return response;
  }

  const rows = Array.isArray(response?.rows) ? response.rows : (Array.isArray(response?.data) ? response.data : []);
  return {
    data: rows,
    meta: {
      endpointReady: true,
      total: Number(response?.total || rows.length || 0),
      info: response?.info || ''
    }
  };
}

export async function getStockPidList(query = {}) {
  const path = withQuery('/stock/pids', query);
  const response = await safeRequest(path, {}, []);

  if (response?.meta?.endpointReady === false) {
    return response;
  }

  return {
    data: Array.isArray(response?.data) ? response.data : [],
    meta: {
      endpointReady: true
    }
  };
}

export async function getStockPidDetail(pid) {
  const normalizedPid = String(pid || '').trim();
  const path = `/stock/pids/${encodeURIComponent(normalizedPid)}`;
  const response = await safeRequest(path, {}, null);

  if (response?.meta?.endpointReady === false) {
    return response;
  }

  return {
    data: response?.data || null,
    meta: {
      endpointReady: true,
    },
  };
}

export async function saveStockPid(payload) {
  const path = '/stock/pids';
  return safeRequest(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload || {})
  }, null);
}

export async function deleteStockPid(payload) {
  const path = '/stock/pids/delete';
  return safeRequest(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload || {})
  }, null);
}

export async function clearStockPid() {
  const path = '/stock/pids/clear';
  return safeRequest(path, {
    method: 'POST'
  }, null);
}

export async function getStockTelusur(query = {}) {
  const path = withQuery('/stock/telusur', query);
  const response = await safeRequest(path, {}, []);

  if (response?.meta?.endpointReady === false) {
    return response;
  }

  return {
    data: Array.isArray(response?.data) ? response.data : [],
    meta: {
      endpointReady: true,
      detectedTable: response?.detected_table || ''
    }
  };
}

export async function getStockVerifikasiTelusur(query = {}) {
  const path = withQuery('/stock/verifikasi-telusur', query);
  const response = await safeRequest(path, {}, []);

  if (response?.meta?.endpointReady === false) {
    return response;
  }

  return {
    data: Array.isArray(response?.data) ? response.data : [],
    meta: {
      endpointReady: true,
      detectedTable: response?.detected_table || ''
    }
  };
}

export async function saveStockTelusur(payload) {
  const path = '/stock/telusur/save';
  return safeRequest(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload || {})
  }, null);
}
