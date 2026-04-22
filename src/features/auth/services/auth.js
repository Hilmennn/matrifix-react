import { apiRequest, clearAuthToken, ensureCsrfCookie } from '../../../shared/lib/api';

function unwrapUserPayload(data) {
  const directUser = data?.user;
  if (directUser?.data) {
    return directUser.data;
  }
  if (directUser) {
    return directUser;
  }

  const nestedUser = data?.data?.user;
  if (nestedUser?.data) {
    return nestedUser.data;
  }
  if (nestedUser) {
    return nestedUser;
  }

  if (data?.data?.data) {
    return data.data.data;
  }

  return data?.data || {};
}

export async function login(payload) {
  await ensureCsrfCookie();
  return apiRequest('/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: payload,
  });
}

export async function logout() {
  try {
    await ensureCsrfCookie();
    return await apiRequest('/auth/logout', {
      method: 'POST',
    });
  } finally {
    clearAuthToken();
  }
}

export async function fetchCurrentUser() {
  const data = await apiRequest('/auth/me', {
    method: 'GET',
    skipUnauthorizedNotify: true,
  });

  return {
    ...data,
    user: unwrapUserPayload(data),
  };
}
