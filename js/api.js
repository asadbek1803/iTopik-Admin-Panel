const API_BASE = 'https://itopik.uz';

function getAccessToken() {
  return localStorage.getItem('access_token');
}

function getRefreshToken() {
  return localStorage.getItem('refresh_token');
}

function setTokens(access, refresh) {
  localStorage.setItem('access_token', access);
  if (refresh) localStorage.setItem('refresh_token', refresh);
}

function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_info');
}

function isAuthenticated() {
  return !!getAccessToken();
}

async function apiRequest(method, path, body = null, params = {}, isFormData = false) {
  const url = new URL(API_BASE + path);
  Object.keys(params).forEach(k => {
    if (params[k] !== null && params[k] !== undefined && params[k] !== '') {
      url.searchParams.set(k, params[k]);
    }
  });

  const headers = {};
  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const fetchOptions = { method, headers };
  if (body) {
    fetchOptions.body = isFormData ? body : JSON.stringify(body);
  }

  let res = await fetch(url.toString(), fetchOptions);

  if (res.status === 401 && getRefreshToken()) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getAccessToken()}`;
      fetchOptions.headers = headers;
      res = await fetch(url.toString(), fetchOptions);
    } else {
      clearTokens();
      window.location.reload();
      throw new Error('Token refresh failed');
    }
  }

  if (res.status === 204) return null;

  const data = await res.json();
  if (!res.ok) {
    const msg = data.detail || data.message || Object.values(data).flat().join(', ') || 'Request failed';
    throw new Error(msg);
  }
  return data;
}

async function tryRefresh() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: getRefreshToken() })
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.access, data.refresh);
    return true;
  } catch {
    return false;
  }
}

async function apiLogin(username, password) {
  const data = await apiRequest('POST', '/api/admin/auth/login/', { username, password });
  if (data.access) {
    setTokens(data.access, data.refresh || null);
  }
  return data;
}

async function apiLogout() {
  try {
    await apiRequest('POST', '/api/admin/auth/logout/', { refresh: getRefreshToken() });
  } catch {}
  clearTokens();
}

// Generic CRUD helpers
async function apiList(endpoint, params = {}) {
  return apiRequest('GET', endpoint, null, params);
}

async function apiGet(endpoint, id) {
  return apiRequest('GET', `${endpoint}${id}/`);
}

async function apiCreate(endpoint, data, isFormData = false) {
  return apiRequest('POST', endpoint, data, {}, isFormData);
}

async function apiUpdate(endpoint, id, data, isFormData = false) {
  return apiRequest('PUT', `${endpoint}${id}/`, data, {}, isFormData);
}

async function apiPatch(endpoint, id, data) {
  return apiRequest('PATCH', `${endpoint}${id}/`, data);
}

async function apiDelete(endpoint, id) {
  return apiRequest('DELETE', `${endpoint}${id}/`);
}

async function apiAction(endpoint, id, action, data = {}) {
  return apiRequest('POST', `${endpoint}${id}/${action}/`, data);
}

async function apiPost(endpoint, data = {}) {
  return apiRequest('POST', endpoint, data);
}
