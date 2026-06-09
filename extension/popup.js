// popup.js — JobTrail popup controller

// ─── State ────────────────────────────────────────────────────────────────────
let allJobs = [];
let currentJobId = null;
let currentTab = 'login';

// ─── DOM helpers ──────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const screens = ['auth-screen', 'dashboard-screen', 'add-screen', 'detail-screen'];

function showScreen(id) {
  screens.forEach((s) => {
    const el = $(s);
    el.classList.toggle('active', s === id);
  });
}

function toast(msg, type = 'success', duration = 2500) {
  const el = $('toast');
  el.textContent = msg;
  el.className = `toast ${type} show`;
  setTimeout(() => el.classList.remove('show'), duration);
}

function setLoading(btnId, loading, label = '') {
  const btn = $(btnId);
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.dataset.originalText = btn.textContent;
    btn.innerHTML = `<span class="spinner"></span> ${label || 'Loading…'}`;
  } else {
    btn.textContent = btn.dataset.originalText || label;
  }
}

// ─── Messaging ────────────────────────────────────────────────────────────────
function send(type, payload = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, payload }, (res) => {
      resolve(res || { ok: false, error: 'No response' });
    });
  });
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
function initAuthScreen() {
  // Tab switching
  document.querySelectorAll('.auth-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      currentTab = tab.dataset.tab;
      document.querySelectorAll('.auth-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      $('register-name-group').style.display = currentTab === 'register' ? 'flex' : 'none';
      $('auth-submit').textContent = currentTab === 'login' ? 'Sign In' : 'Create Account';
      $('auth-error').textContent = '';
    });
  });

  $('auth-submit').addEventListener('click', handleAuth);
  document.querySelectorAll('#auth-screen input').forEach((inp) => {
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleAuth(); });
  });
}

async function handleAuth() {
  const email = $('auth-email').value.trim();
  const password = $('auth-password').value;
  const name = $('auth-name').value.trim();
  $('auth-error').textContent = '';

  if (!email || !password) {
    $('auth-error').textContent = 'Email and password are required.';
    return;
  }

  setLoading('auth-submit', true, currentTab === 'login' ? 'Signing in…' : 'Creating account…');

  const type = currentTab === 'login' ? 'AUTH_LOGIN' : 'AUTH_REGISTER';
  const payload = currentTab === 'login' ? { email, password } : { email, password, name };
  const res = await send(type, payload);

  setLoading('auth-submit', false, currentTab === 'login' ? 'Sign In' : 'Create Account');

  if (res.ok) {
    await loadDashboard();
  } else {
    $('auth-error').textContent = res.data?.error || res.error || 'Authentication failed.';
  }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
async function loadDashboard() {
  showScreen('dashboard-screen');

  // Render cached jobs instantly so the popup feels immediate
  const cached = await getCachedJobs();
  if (cached.length > 0) {
    allJobs = cached;
    renderDashboard(allJobs);
  }

  // Fetch fresh data in the background
  const res = await send('GET_JOBS');
  if (!res.ok) {
    if (res.status === 401) { showScreen('auth-screen'); return; }
    if (cached.length === 0) toast('Failed to load jobs', 'error');
    return;
  }
  allJobs = res.data.jobs || [];
  await setCachedJobs(allJobs);
  renderDashboard(allJobs);
}

function renderDashboard(jobs) {
  // Stats
  const active = jobs.filter((j) => ['applied', 'phone_screen', 'interview'].includes(j.status));
  const interviews = jobs.filter((j) => j.status === 'interview');
  const offers = jobs.filter((j) => j.status === 'offer');
  $('stat-total').textContent = jobs.length;
  $('stat-active').textContent = active.length;
  $('stat-interviews').textContent = interviews.length;
  $('stat-offers').textContent = offers.length;

  // Jobs list
  const listEl = $('jobs-list');
  if (jobs.length === 0) {
    const isFiltering = $('search-input').value.trim() || $('filter-status').value;
    listEl.innerHTML = `
      <div class="empty-state">
        <p>${isFiltering ? 'No matching applications.' : 'No applications yet.'}</p>
        <small>${isFiltering ? 'Try a different search or filter.' : 'Click "+ Add Job" on any job board to start tracking.'}</small>
      </div>`;
    return;
  }

  listEl.innerHTML = jobs
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .map(
      (j) => `
      <div class="job-card" data-id="${j.id}">
        <div class="job-card-left">
          <div class="job-card-company">${esc(j.company)}</div>
          <div class="job-card-role">${esc(j.role)}</div>
        </div>
        <span class="status-badge status-${j.status}">${statusLabel(j.status)}</span>
      </div>`
    )
    .join('');

  listEl.querySelectorAll('.job-card').forEach((card) => {
    card.addEventListener('click', () => openDetail(card.dataset.id));
  });
}

function applyFilters() {
  const query = $('search-input').value.toLowerCase().trim();
  const status = $('filter-status').value;

  let filtered = allJobs;
  if (status) filtered = filtered.filter((j) => j.status === status);
  if (query) filtered = filtered.filter((j) =>
    (j.company || '').toLowerCase().includes(query) ||
    (j.role || '').toLowerCase().includes(query) ||
    (j.location || '').toLowerCase().includes(query)
  );

  renderDashboard(filtered);
}

function initDashboard() {
  $('add-job-btn').addEventListener('click', openAddScreen);
  $('logout-btn').addEventListener('click', handleLogout);
  $('filter-status').addEventListener('change', applyFilters);
  $('search-input').addEventListener('input', applyFilters);
}

async function handleLogout() {
  await send('AUTH_LOGOUT');
  allJobs = [];
  $('auth-email').value = '';
  $('auth-password').value = '';
  showScreen('auth-screen');
}

// ─── Add Job ──────────────────────────────────────────────────────────────────
function openAddScreen() {
  // Reset form
  ['field-company', 'field-role', 'field-location', 'field-pay', 'field-link', 'field-notes'].forEach(
    (id) => { $(id).value = ''; }
  );
  $('field-status').value = 'applied';
  $('field-term').value = '';
  $('field-reason').value = '';
  $('field-reason-group').style.display = 'none';
  $('field-date').value = new Date().toISOString().slice(0, 10);
  $('extract-status').style.display = 'none';
  showScreen('add-screen');
}

function toggleReasonField(statusId, groupId) {
  const status = $(statusId).value;
  $(groupId).style.display = (status === 'rejected' || status === 'ghosted') ? 'flex' : 'none';
}

function initAddScreen() {
  $('add-back-btn').addEventListener('click', () => showScreen('dashboard-screen'));
  $('add-cancel-btn').addEventListener('click', () => showScreen('dashboard-screen'));
  $('autofill-btn').addEventListener('click', handleAutofill);
  $('save-job-btn').addEventListener('click', handleSaveJob);
  $('field-status').addEventListener('change', () => toggleReasonField('field-status', 'field-reason-group'));
}

async function handleAutofill() {
  setLoading('autofill-btn', true, 'Reading page…');
  $('extract-status').style.display = 'flex';
  $('extract-status-text').textContent = 'Scraping job page…';

  // 1. Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    toast('No active tab found', 'error');
    setLoading('autofill-btn', false, '✨ Auto-fill from page');
    return;
  }

  // 2. Ask content script to scrape
  let scrapeResult;
  try {
    scrapeResult = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_JOB' }, (res) => { // sends to the content script in a specific tab
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(res);
      });
    });
  } catch (err) {
    // Content script not injected yet — try injecting programmatically
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      scrapeResult = await new Promise((resolve, reject) => {
        setTimeout(() => {
          chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_JOB' }, (res) => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve(res);
          });
        }, 300);
      });
    } catch (injectErr) {
      toast('Cannot scrape this page', 'error');
      setLoading('autofill-btn', false, '✨ Auto-fill from page');
      $('extract-status').style.display = 'none';
      return;
    }
  }

  if (!scrapeResult?.success) {
    toast('Scraping failed', 'error');
    setLoading('autofill-btn', false, '✨ Auto-fill from page');
    $('extract-status').style.display = 'none';
    return;
  }

  // 3. Send to backend for Claude extraction
  $('extract-status-text').textContent = 'Claude is reading the job…';
  const res = await send('EXTRACT_JOB', {
    text: scrapeResult.data.text,
    url: scrapeResult.data.url,
    title: scrapeResult.data.title,
  });

  setLoading('autofill-btn', false, '✨ Auto-fill from page');
  $('extract-status').style.display = 'none';

  if (!res.ok) {
    toast(res.data?.error || 'Extraction failed', 'error');
    return;
  }

  // 4. Pre-fill form
  const job = res.data.job || {};
  if (job.company) $('field-company').value = job.company;
  if (job.role) $('field-role').value = job.role;
  if (job.location) $('field-location').value = job.location;
  if (job.pay) $('field-pay').value = job.pay;
  if (job.url) $('field-link').value = job.url || scrapeResult.data.url;
  if (job.notes) $('field-notes').value = job.notes;
  if (job.term) {
    // Only set if it's a valid option in the dropdown
    const opts = Array.from($('field-term').options).map(o => o.value);
    if (opts.includes(job.term)) $('field-term').value = job.term;
  }

  toast('Auto-filled from page ✓');
}

async function handleSaveJob() {
  const company = $('field-company').value.trim();
  const role = $('field-role').value.trim();
  if (!company || !role) {
    toast('Company and role are required', 'error');
    return;
  }

  setLoading('save-job-btn', true, 'Saving…');
  const res = await send('CREATE_JOB', {
    company,
    role,
    location: $('field-location').value.trim(),
    pay: $('field-pay').value.trim(),
    link: $('field-link').value.trim(),
    status: $('field-status').value,
    term: $('field-term').value,
    reason: $('field-reason').value,
    applied_date: $('field-date').value,
    notes: $('field-notes').value.trim(),
  });
  setLoading('save-job-btn', false, 'Save Application');

  if (res.ok) {
    allJobs.unshift(res.data.job);
    renderDashboard(allJobs);
    showScreen('dashboard-screen');
    toast('Application saved ✓');
  } else {
    toast(res.data?.error || 'Save failed', 'error');
  }
}

// ─── Detail / Edit ────────────────────────────────────────────────────────────
function openDetail(id) {
  const job = allJobs.find((j) => String(j.id) === String(id));
  if (!job) return;
  currentJobId = id;

  $('detail-title').textContent = `${job.company} — ${job.role}`;
  $('edit-company').value = job.company || '';
  $('edit-role').value = job.role || '';
  $('edit-location').value = job.location || '';
  $('edit-pay').value = job.pay || '';
  $('edit-link').value = job.link || '';
  $('edit-status').value = job.status || 'applied';
  $('edit-term').value = job.term || '';
  $('edit-reason').value = job.reason || '';
  $('edit-reason-group').style.display = (job.status === 'rejected' || job.status === 'ghosted') ? 'flex' : 'none';
  $('edit-date').value = job.applied_date ? job.applied_date.slice(0, 10) : '';
  $('edit-notes').value = job.notes || '';

  showScreen('detail-screen');
}

function initDetailScreen() {
  $('detail-back-btn').addEventListener('click', () => showScreen('dashboard-screen'));
  $('detail-cancel-btn').addEventListener('click', () => showScreen('dashboard-screen'));
  $('detail-save-btn').addEventListener('click', handleUpdateJob);
  $('detail-delete-btn').addEventListener('click', handleDeleteJob);
  $('edit-status').addEventListener('change', () => toggleReasonField('edit-status', 'edit-reason-group'));
}

async function handleUpdateJob() {
  setLoading('detail-save-btn', true, 'Saving…');
  const res = await send('UPDATE_JOB', {
    id: currentJobId,
    updates: {
      company: $('edit-company').value.trim(),
      role: $('edit-role').value.trim(),
      location: $('edit-location').value.trim(),
      pay: $('edit-pay').value.trim(),
      link: $('edit-link').value.trim(),
      status: $('edit-status').value,
      term: $('edit-term').value,
      reason: $('edit-reason').value,
      applied_date: $('edit-date').value,
      notes: $('edit-notes').value.trim(),
    },
  });
  setLoading('detail-save-btn', false, 'Save Changes');

  if (res.ok) {
    const idx = allJobs.findIndex((j) => String(j.id) === String(currentJobId));
    if (idx !== -1) allJobs[idx] = res.data.job;
    renderDashboard(allJobs);
    showScreen('dashboard-screen');
    toast('Changes saved ✓');
  } else {
    toast(res.data?.error || 'Update failed', 'error');
  }
}

async function handleDeleteJob() {
  if (!confirm(`Delete this application?`)) return;
  const res = await send('DELETE_JOB', { id: currentJobId });
  if (res.ok) {
    allJobs = allJobs.filter((j) => String(j.id) !== String(currentJobId));
    renderDashboard(allJobs);
    showScreen('dashboard-screen');
    toast('Deleted');
  } else {
    toast('Delete failed', 'error');
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function esc(str = '') {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function statusLabel(status) {
  const map = {
    applied: 'Applied',
    phone_screen: 'Phone Screen',
    interview: 'Interview',
    offer: 'Offer',
    rejected: 'Rejected',
    ghosted: 'Ghosted',
  };
  return map[status] || status;
}

// ─── Term options ─────────────────────────────────────────────────────────────

function buildTermOptions() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  // Generate upcoming terms only (don't show past ones)
  const terms = [];
  for (let y = year; y <= year + 1; y++) {
    // Summer: show if we're before August of that year
    if (y > year || month < 8) terms.push(`Summer ${y}`);
    // Fall: show if we're before December of that year
    if (y > year || month < 12) terms.push(`Fall ${y}`);
    // Spring: always show next year's spring
    if (y > year) terms.push(`Spring ${y}`);
  }
  terms.push('Full-time');

  const html = `<option value="">— Select —</option>` +
    terms.map(t => `<option value="${t}">${t}</option>`).join('');

  document.querySelectorAll('#field-term, #edit-term').forEach(el => {
    el.innerHTML = html;
  });
}

// ─── Job cache (stale-while-revalidate) ───────────────────────────────────────
function getCachedJobs() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['jt_jobs_cache'], (r) => resolve(r.jt_jobs_cache || []));
  });
}

function setCachedJobs(jobs) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ jt_jobs_cache: jobs }, resolve);
  });
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function init() {
  buildTermOptions();
  initAuthScreen();
  initDashboard();
  initAddScreen();
  initDetailScreen();

  // Warm up the backend immediately so it's ready by the time the user clicks anything
  send('PING').catch(() => {});

  // Check if already logged in
  const authCheck = await send('AUTH_CHECK');
  if (authCheck.hasToken) {
    await loadDashboard();
  } else {
    showScreen('auth-screen');
  }
}

document.addEventListener('DOMContentLoaded', init);
