// background.js — JobTrail service worker (Manifest V3)
// Handles auth token storage and proxies API calls to the backend.

const API_BASE_URL = 'https://jobtrail-en88.onrender.com'; // update after deploy

// ─── Token helpers ────────────────────────────────────────────────────────────

async function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['jt_token'], (result) => {
      resolve(result.jt_token || null);
    });
  });
}

async function setToken(token) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ jt_token: token }, resolve);
  });
}

async function clearToken() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['jt_token'], resolve);
  });
}

// ─── API helper ───────────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const token = await getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

// ─── Message router ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((err) => sendResponse({ ok: false, error: err.message }));
  return true; // keep channel open for async
});

async function handleMessage(message) {
  switch (message.type) {
    // ── Auth ──────────────────────────────────────────────────────────────────
    case 'AUTH_REGISTER': {
      const res = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(message.payload),
      });
      if (res.ok && res.data.token) await setToken(res.data.token);
      return res;
    }

    case 'AUTH_LOGIN': {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(message.payload),
      });
      if (res.ok && res.data.token) await setToken(res.data.token);
      return res;
    }

    case 'AUTH_LOGOUT': {
      await clearToken();
      await new Promise((r) => chrome.storage.local.remove(['jt_jobs_cache'], r));
      return { ok: true };
    }

    case 'PING': {
      // Fire-and-forget wake-up call to prevent Render cold starts
      fetch(`${API_BASE_URL}/health`).catch(() => {});
      return { ok: true };
    }

    case 'AUTH_CHECK': {
      const token = await getToken();
      return { ok: true, hasToken: !!token };
    }

    // ── Job extraction ────────────────────────────────────────────────────────
    case 'EXTRACT_JOB': {
      return await apiFetch('/jobs/extract', {
        method: 'POST',
        body: JSON.stringify(message.payload),
      });
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────
    case 'GET_JOBS': {
      return await apiFetch('/jobs');
    }

    case 'CREATE_JOB': {
      return await apiFetch('/jobs', {
        method: 'POST',
        body: JSON.stringify(message.payload),
      });
    }

    case 'UPDATE_JOB': {
      return await apiFetch(`/jobs/${message.payload.id}`, {
        method: 'PATCH',
        body: JSON.stringify(message.payload.updates),
      });
    }

    case 'DELETE_JOB': {
      return await apiFetch(`/jobs/${message.payload.id}`, {
        method: 'DELETE',
      });
    }

    default:
      return { ok: false, error: `Unknown message type: ${message.type}` };
  }
}
