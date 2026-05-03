/*
 * Ghost Client — Privacy-First API Client
 * Copyright (c) 2025 BlackWh1te
 * Licensed under the MIT License.
 * See LICENSE file for details.
 */

(function() {
  'use strict';

  // ===== IndexedDB =====
  const DB_NAME = 'GhostClient';
  const DB_VERSION = 1;

  let db = null;

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => { db = req.result; resolve(db); };
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains('collections')) d.createObjectStore('collections', { keyPath: 'id', autoIncrement: true });
        if (!d.objectStoreNames.contains('requests')) d.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
        if (!d.objectStoreNames.contains('history')) d.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
        if (!d.objectStoreNames.contains('environments')) d.createObjectStore('environments', { keyPath: 'id', autoIncrement: true });
      };
    });
  }

  function dbGet(store, id) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const os = tx.objectStore(store);
      const req = id !== undefined ? os.get(id) : os.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function dbPut(store, obj) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const os = tx.objectStore(store);
      const req = os.put(obj);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function dbDelete(store, id) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const os = tx.objectStore(store);
      const req = os.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  function dbClear(store) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const os = tx.objectStore(store);
      const req = os.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // ===== State =====
  let currentRequestId = null;
  let activeEnvId = null;
  let envsCache = [];

  // ===== DOM helpers =====
  function $(sel) { return document.querySelector(sel); }
  function $$$(sel) { return document.querySelectorAll(sel); }
  function on(el, evt, fn) { el.addEventListener(evt, fn); }

  // ===== Toast =====
  function toast(msg, type = 'info') {
    let container = $('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  // ===== Modal =====
  function showModal(title, content, onConfirm, onCancel) {
    $('#modalTitle').textContent = title;
    $('#modalBody').innerHTML = '';
    if (typeof content === 'string') {
      $('#modalBody').innerHTML = content;
    } else {
      $('#modalBody').appendChild(content);
    }
    $('#modalOverlay').classList.add('open');

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn-primary';
    confirmBtn.textContent = 'Confirm';
    confirmBtn.style.marginTop = '12px';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.marginTop = '12px';

    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    $('#modalBody').appendChild(actions);

    const cleanup = () => {
      $('#modalOverlay').classList.remove('open');
    };

    on(confirmBtn, 'click', () => { cleanup(); if (onConfirm) onConfirm(); });
    on(cancelBtn, 'click', () => { cleanup(); if (onCancel) onCancel(); });
    on($('#modalClose'), 'click', cleanup);
    on($('#modalOverlay'), 'click', (e) => { if (e.target === $('#modalOverlay')) cleanup(); });
  }

  // ===== JSON Tree Renderer =====
  function renderJsonTree(obj, level = 0) {
    if (obj === null) return '<span class="null">null</span>';
    const type = typeof obj;
    if (type === 'string') return `<span class="string">"${escapeHtml(obj)}"</span>`;
    if (type === 'number') return `<span class="number">${obj}</span>`;
    if (type === 'boolean') return `<span class="boolean">${obj}</span>`;

    if (Array.isArray(obj)) {
      if (obj.length === 0) return '<span class="boolean">[]</span>';
      const id = 'arr_' + Math.random().toString(36).slice(2);
      let html = `<span class="expanded" id="${id}"><span class="toggle" onclick="toggleJson('${id}')"></span><span class="boolean">[</span><span class="collapsible">`;
      obj.forEach((item, i) => {
        html += `<div class="indent">${renderJsonTree(item, level + 1)}${i < obj.length - 1 ? '<span class="text-tertiary">,</span>' : ''}</div>`;
      });
      html += `</span><span class="boolean">]</span></span>`;
      return html;
    }

    const keys = Object.keys(obj);
    if (keys.length === 0) return '<span class="boolean">{}</span>';
    const id = 'obj_' + Math.random().toString(36).slice(2);
    let html = `<span class="expanded" id="${id}"><span class="toggle" onclick="toggleJson('${id}')"></span><span class="boolean">{</span><span class="collapsible">`;
    keys.forEach((key, i) => {
      html += `<div class="indent"><span class="key">"${escapeHtml(key)}"</span><span class="text-tertiary">: </span>${renderJsonTree(obj[key], level + 1)}${i < keys.length - 1 ? '<span class="text-tertiary">,</span>' : ''}</div>`;
    });
    html += `</span><span class="boolean">}</span></span>`;
    return html;
  }

  window.toggleJson = function(id) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('collapsed');
    el.classList.toggle('expanded');
  };

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function prettyJson(text) {
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch { return text; }
  }

  // ===== Tab Switching =====
  function initTabs(tabSelector, panelPrefix, activeClass = 'active') {
    on(document, 'click', (e) => {
      const btn = e.target.closest(tabSelector);
      if (!btn) return;
      const tab = btn.dataset.tab;
      const container = btn.closest('.sidebar, .request-section, .response-header');
      container.querySelectorAll(tabSelector).forEach(b => b.classList.remove(activeClass));
      btn.classList.add(activeClass);

      let panels;
      if (container.classList.contains('sidebar')) {
        panels = document.querySelectorAll('.sidebar-panel');
      } else if (container.classList.contains('request-section')) {
        panels = document.querySelectorAll('.request-panel');
      } else {
        panels = document.querySelectorAll('.response-panel');
      }
      panels.forEach(p => p.classList.remove(activeClass));
      if (container.classList.contains('sidebar')) {
        document.getElementById('panel-' + tab).classList.add(activeClass);
      } else if (container.classList.contains('request-section')) {
        document.getElementById('req-' + tab).classList.add(activeClass);
      } else {
        document.getElementById('res-' + tab).classList.add(activeClass);
      }
    });
  }

  // ===== Key-Value Rows =====
  function createKvRow(key = '', val = '') {
    const row = document.createElement('div');
    row.className = 'kv-row';
    row.innerHTML = `
      <input type="text" class="kv-key" placeholder="Key" value="${escapeHtml(key)}">
      <input type="text" class="kv-val" placeholder="Value" value="${escapeHtml(val)}">
      <button class="kv-del">×</button>
    `;
    on(row.querySelector('.kv-del'), 'click', () => row.remove());
    return row;
  }

  function getKvData(container) {
    const data = {};
    container.querySelectorAll('.kv-row').forEach(row => {
      const k = row.querySelector('.kv-key').value.trim();
      const v = row.querySelector('.kv-val').value.trim();
      if (k) data[k] = substituteEnv(v);
    });
    return data;
  }

  function setKvData(container, data) {
    container.innerHTML = '';
    if (!data || Object.keys(data).length === 0) {
      container.appendChild(createKvRow());
      return;
    }
    Object.entries(data).forEach(([k, v]) => {
      container.appendChild(createKvRow(k, v));
    });
  }

  // ===== Environment Substitution =====
  function substituteEnv(str) {
    if (!str || !str.includes('{{')) return str;
    const active = envsCache.find(e => e.id === activeEnvId);
    if (!active || !active.vars) return str;
    let result = str;
    Object.entries(active.vars).forEach(([k, v]) => {
      result = result.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), v);
    });
    return result;
  }

  // ===== Request Engine =====
  async function sendRequest() {
    const method = $('#httpMethod').value;
    const rawUrl = $('#requestUrl').value.trim();
    if (!rawUrl) { toast('Please enter a URL', 'error'); return; }

    const url = substituteEnv(rawUrl);
    const headers = getKvData($('#headersList'));
    const params = getKvData($('#paramsList'));

    // Build URL with params
    const urlObj = new URL(url);
    Object.entries(params).forEach(([k, v]) => urlObj.searchParams.set(k, v));
    const finalUrl = urlObj.toString();

    // Body
    let body = null;
    const bodyType = $('#bodyType').value;
    if (bodyType === 'json') {
      const rawBody = $('#bodyEditor').value.trim();
      if (rawBody) {
        body = substituteEnv(rawBody);
        if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
      }
    } else if (bodyType === 'form') {
      // For form data we'd use FormData, keeping simple for now
      body = $('#bodyEditor').value;
    } else if (bodyType === 'text') {
      body = $('#bodyEditor').value;
      if (body && !headers['Content-Type']) headers['Content-Type'] = 'text/plain';
    } else if (bodyType === 'raw') {
      body = $('#bodyEditor').value;
    }

    // Auth
    const authType = $('#authType').value;
    if (authType === 'bearer') {
      const token = substituteEnv($('#authBearerToken').value || '').trim();
      if (token) headers['Authorization'] = 'Bearer ' + token;
    } else if (authType === 'basic') {
      const u = substituteEnv($('#authBasicUser').value || '');
      const p = substituteEnv($('#authBasicPass').value || '');
      if (u) headers['Authorization'] = 'Basic ' + btoa(u + ':' + p);
    } else if (authType === 'apikey') {
      const key = substituteEnv($('#authApiKey').value || '');
      const loc = $('#authApiKeyLoc').value;
      const name = $('#authApiKeyName').value || 'X-API-Key';
      if (key) {
        if (loc === 'header') headers[name] = key;
        else urlObj.searchParams.set(name, key);
      }
    }

    // UI state
    $('#sendBtn').innerHTML = '<div class="spinner"></div> Sending...';
    $('#sendBtn').disabled = true;
    $('#statusCode').textContent = '...';
    $('#statusCode').className = 'status-code';
    $('#statusText').textContent = '';
    $('#responseTime').textContent = '';
    $('#responseSize').textContent = '';

    const startTime = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(finalUrl, {
        method,
        headers,
        body: body && method !== 'GET' && method !== 'HEAD' ? body : null,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const elapsed = Math.round(performance.now() - startTime);

      const responseText = await response.text();
      const size = new Blob([responseText]).size;

      // Status code styling
      const code = response.status;
      $('#statusCode').textContent = code;
      $('#statusCode').className = 'status-code ' + (code < 300 ? 'success' : code < 400 ? 'warning' : code < 500 ? 'error' : 'error');
      $('#statusText').textContent = response.statusText;
      $('#responseTime').textContent = elapsed + ' ms';
      $('#responseSize').textContent = formatBytes(size);

      // Headers
      const resHeaders = {};
      response.headers.forEach((v, k) => resHeaders[k] = v);
      renderHeaders(resHeaders);

      // Cookies
      renderCookies(document.cookie);

      // Body
      const contentType = response.headers.get('content-type') || '';
      let formatted = responseText;
      if (contentType.includes('json')) {
        try { formatted = JSON.stringify(JSON.parse(responseText), null, 2); } catch {}
      }

      $('#responseBody').innerHTML = '<div class="json-tree">' + renderJsonTree(JSON.parse(responseText)) + '</div>';
      window._lastResponse = { text: responseText, headers: resHeaders, status: code, statusText: response.statusText, time: elapsed, size };

      // Save to history
      await saveHistory({
        method,
        url: rawUrl,
        headers: getKvData($('#headersList')),
        params,
        body: bodyType === 'none' ? null : $('#bodyEditor').value,
        bodyType,
        authType,
        authConfig: getAuthConfig(),
        status: code,
        time: elapsed,
        timestamp: Date.now(),
      });
      await renderHistory();

      toast(`Response received: ${code} in ${elapsed}ms`, code < 300 ? 'success' : 'info');
    } catch (err) {
      $('#statusCode').textContent = 'ERR';
      $('#statusCode').className = 'status-code error';
      $('#statusText').textContent = err.name === 'AbortError' ? 'Request timeout' : err.message;
      $('#responseBody').innerHTML = `<code class="language-json" style="color:var(--accent-red)">Error: ${escapeHtml(err.message)}</code>`;
      toast(err.message, 'error');
    } finally {
      $('#sendBtn').innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg> Send`;
      $('#sendBtn').disabled = false;
    }
  }

  function formatBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  function renderHeaders(headers) {
    const container = $('#responseHeaders');
    container.innerHTML = '';
    Object.entries(headers).forEach(([k, v]) => {
      const row = document.createElement('div');
      row.className = 'header-row';
      row.innerHTML = `<div class="header-name">${escapeHtml(k)}</div><div class="header-value">${escapeHtml(v)}</div>`;
      container.appendChild(row);
    });
  }

  function renderCookies(cookies) {
    const container = $('#responseCookies');
    container.innerHTML = '';
    if (!cookies || !cookies.trim()) {
      container.innerHTML = '<div class="empty-state">No cookies received</div>';
      return;
    }
    cookies.split(';').forEach(c => {
      const [name, ...rest] = c.trim().split('=');
      if (!name) return;
      const row = document.createElement('div');
      row.className = 'header-row';
      row.innerHTML = `<div class="header-name">${escapeHtml(name.trim())}</div><div class="header-value">${escapeHtml(rest.join('=').trim())}</div>`;
      container.appendChild(row);
    });
  }

  function getAuthConfig() {
    const type = $('#authType').value;
    if (type === 'bearer') return { type, token: $('#authBearerToken')?.value || '' };
    if (type === 'basic') return { type, user: $('#authBasicUser')?.value || '', pass: $('#authBasicPass')?.value || '' };
    if (type === 'apikey') return { type, key: $('#authApiKey')?.value || '', name: $('#authApiKeyName')?.value || '', loc: $('#authApiKeyLoc')?.value || 'header' };
    return { type: 'none' };
  }

  function setAuthConfig(config) {
    if (!config || config.type === 'none') {
      $('#authType').value = 'none';
      renderAuthFields();
      return;
    }
    $('#authType').value = config.type;
    renderAuthFields();
    setTimeout(() => {
      if (config.type === 'bearer') $('#authBearerToken').value = config.token || '';
      if (config.type === 'basic') {
        $('#authBasicUser').value = config.user || '';
        $('#authBasicPass').value = config.pass || '';
      }
      if (config.type === 'apikey') {
        $('#authApiKey').value = config.key || '';
        $('#authApiKeyName').value = config.name || '';
        $('#authApiKeyLoc').value = config.loc || 'header';
      }
    }, 0);
  }

  function renderAuthFields() {
    const type = $('#authType').value;
    const container = $('#authFields');
    container.innerHTML = '';
    if (type === 'none') return;

    if (type === 'bearer') {
      container.innerHTML = `
        <div class="auth-field-row">
          <label>Token</label>
          <input type="text" id="authBearerToken" placeholder="eyJhbGciOiJIUzI1NiIs...">
        </div>`;
    } else if (type === 'basic') {
      container.innerHTML = `
        <div class="auth-field-row">
          <label>Username</label>
          <input type="text" id="authBasicUser">
        </div>
        <div class="auth-field-row">
          <label>Password</label>
          <input type="password" id="authBasicPass">
        </div>`;
    } else if (type === 'apikey') {
      container.innerHTML = `
        <div class="auth-field-row">
          <label>Key Name</label>
          <input type="text" id="authApiKeyName" value="X-API-Key">
        </div>
        <div class="auth-field-row">
          <label>Key Value</label>
          <input type="text" id="authApiKey">
        </div>
        <div class="auth-field-row">
          <label>Add to</label>
          <select id="authApiKeyLoc" style="padding:6px 10px;font-size:12px;border:1px solid var(--border-default);border-radius:var(--radius-sm);background:var(--bg-elevated);color:var(--text-primary);outline:none;">
            <option value="header">Header</option>
            <option value="query">Query Param</option>
          </select>
        </div>`;
    }
  }

  // ===== History =====
  async function saveHistory(entry) {
    const all = await dbGet('history');
    if (all.length >= 100) {
      const oldest = all.sort((a, b) => a.timestamp - b.timestamp)[0];
      await dbDelete('history', oldest.id);
    }
    await dbPut('history', entry);
  }

  async function renderHistory() {
    const container = $('#historyList');
    const items = (await dbGet('history')).sort((a, b) => b.timestamp - a.timestamp);
    container.innerHTML = '';
    if (items.length === 0) {
      container.innerHTML = '<div class="empty-state"><div>Send your first request to see history here</div></div>';
      return;
    }
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'hist-item';
      el.innerHTML = `
        <span class="hist-method ${item.method.toLowerCase()}">${item.method}</span>
        <span class="hist-url">${escapeHtml(truncate(item.url, 35))}</span>
        <span style="font-size:10px;color:var(--text-muted)">${formatTime(item.timestamp)}</span>
      `;
      on(el, 'click', () => loadRequestFromHistory(item));
      container.appendChild(el);
    });
  }

  function loadRequestFromHistory(item) {
    $('#httpMethod').value = item.method;
    $('#requestUrl').value = item.url;
    setKvData($('#headersList'), item.headers || {});
    setKvData($('#paramsList'), item.params || {});
    $('#bodyType').value = item.bodyType || 'none';
    $('#bodyEditor').value = item.body || '';
    setAuthConfig(item.authConfig || { type: 'none' });
  }

  function truncate(s, n) { return s.length > n ? s.slice(0, n) + '...' : s; }
  function formatTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h';
    return d.toLocaleDateString();
  }

  // ===== Collections =====
  async function renderCollections() {
    const container = $('#collectionsList');
    const collections = await dbGet('collections');
    const allReqs = await dbGet('requests');
    container.innerHTML = '';

    if (collections.length === 0) {
      container.innerHTML = '<div class="empty-state"><div>Create a collection to organize your requests</div></div>';
      return;
    }

    for (const coll of collections) {
      const folder = document.createElement('div');
      folder.className = 'coll-folder';
      const header = document.createElement('div');
      header.className = 'coll-folder-header';
      header.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
        <span style="flex:1">${escapeHtml(coll.name)}</span>
        <button class="coll-action-btn" data-action="add" title="Add request">+</button>
        <button class="coll-action-btn" data-action="del" title="Delete">×</button>
      `;

      on(header.querySelector('[data-action="add"]'), 'click', (e) => {
        e.stopPropagation();
        addRequestToCollection(coll.id);
      });
      on(header.querySelector('[data-action="del"]'), 'click', (e) => {
        e.stopPropagation();
        showModal('Delete Collection', `Delete "${coll.name}"?`, async () => {
          await dbDelete('collections', coll.id);
          const reqsToDel = await dbGet('requests');
          for (const r of reqsToDel) { if (r.collectionId === coll.id) await dbDelete('requests', r.id); }
          await renderCollections();
          toast('Collection deleted', 'info');
        });
      });

      const children = document.createElement('div');
      children.className = 'coll-folder-children';
      const collReqs = allReqs.filter(r => r.collectionId === coll.id);
      collReqs.forEach(req => {
        const r = document.createElement('div');
        r.className = 'coll-req-item' + (currentRequestId === req.id ? ' active' : '');
        r.innerHTML = `<span class="hist-method ${req.method.toLowerCase()}">${req.method}</span><span>${escapeHtml(req.name)}</span>`;
        on(r, 'click', () => {
          loadRequest(req);
          currentRequestId = req.id;
          renderCollections();
        });
        children.appendChild(r);
      });

      on(header, 'click', () => {
        children.classList.toggle('collapsed');
      });

      folder.appendChild(header);
      folder.appendChild(children);
      container.appendChild(folder);
    }
  }

  async function addRequestToCollection(collId) {
    const modalBody = document.createElement('div');
    modalBody.innerHTML = `
      <input type="text" id="reqNameInput" placeholder="Request name" value="${$('#httpMethod').value} ${truncate($('#requestUrl').value, 40)}">
    `;
    showModal('Save to Collection', modalBody, async () => {
      const name = $('#reqNameInput').value.trim();
      if (!name) return;
      const req = {
        name,
        collectionId: collId,
        method: $('#httpMethod').value,
        url: $('#requestUrl').value,
        headers: getKvData($('#headersList')),
        params: getKvData($('#paramsList')),
        bodyType: $('#bodyType').value,
        body: $('#bodyEditor').value,
        authConfig: getAuthConfig(),
        timestamp: Date.now(),
      };
      await dbPut('requests', req);
      await renderCollections();
      toast('Request saved to collection', 'success');
    });
  }

  function loadRequest(req) {
    $('#httpMethod').value = req.method;
    $('#requestUrl').value = req.url;
    setKvData($('#headersList'), req.headers || {});
    setKvData($('#paramsList'), req.params || {});
    $('#bodyType').value = req.bodyType || 'none';
    $('#bodyEditor').value = req.body || '';
    setAuthConfig(req.authConfig || { type: 'none' });
  }

  // ===== Environments =====
  async function renderEnvironments() {
    const container = $('#envList');
    const envs = await dbGet('environments');
    envsCache = envs;
    container.innerHTML = '';

    if (envs.length === 0) {
      container.innerHTML = '<div class="empty-state"><div>Create environments for variables like base URLs and tokens</div></div>';
      return;
    }

    envs.forEach(env => {
      const el = document.createElement('div');
      el.className = 'env-item' + (env.id === activeEnvId ? ' active' : '');
      el.innerHTML = `<span style="flex:1">${escapeHtml(env.name)}</span><span style="font-size:10px;color:var(--text-muted)">${Object.keys(env.vars || {}).length} vars</span>`;
      on(el, 'click', () => {
        activeEnvId = env.id;
        renderEnvironments();
        toast(`Active: ${env.name}`, 'info');
      });
      container.appendChild(el);
    });
  }

  // ===== Import / Export =====
  async function exportData() {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      collections: await dbGet('collections'),
      requests: await dbGet('requests'),
      environments: await dbGet('environments'),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ghost-client-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Export downloaded', 'success');
  }

  async function importData(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.collections) {
        for (const c of data.collections) { c.id = undefined; await dbPut('collections', c); }
      }
      if (data.requests) {
        for (const r of data.requests) { r.id = undefined; await dbPut('requests', r); }
      }
      if (data.environments) {
        for (const e of data.environments) { e.id = undefined; await dbPut('environments', e); }
      }
      await renderCollections();
      await renderEnvironments();
      await renderHistory();
      toast('Import successful', 'success');
    } catch (err) {
      toast('Import failed: ' + err.message, 'error');
    }
  }

  async function importPostman(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const coll = { name: data.info?.name || 'Imported Postman', timestamp: Date.now() };
      const collId = await dbPut('collections', coll);

      function walk(items) {
        for (const item of items || []) {
          if (item.request) {
            const r = item.request;
            const req = {
              name: item.name || 'Untitled',
              collectionId: collId,
              method: (r.method || 'GET').toUpperCase(),
              url: typeof r.url === 'string' ? r.url : r.url?.raw || '',
              headers: {},
              params: {},
              bodyType: 'none',
              body: null,
              authConfig: { type: 'none' },
              timestamp: Date.now(),
            };
            if (r.header) {
              for (const h of r.header) req.headers[h.key] = h.value;
            }
            if (r.url?.query) {
              for (const q of r.url.query) req.params[q.key] = q.value;
            }
            if (r.body) {
              if (r.body.mode === 'raw') { req.bodyType = 'raw'; req.body = r.body.raw; }
              else if (r.body.mode === 'json') { req.bodyType = 'json'; req.body = r.body.raw; }
            }
            dbPut('requests', req);
          }
          if (item.item) walk(item.item);
        }
      }
      walk(data.item);
      await renderCollections();
      toast('Postman collection imported', 'success');
    } catch (err) {
      toast('Import failed: ' + err.message, 'error');
    }
  }

  // ===== Divider resize =====
  let isDragging = false;
  on($('#divider'), 'mousedown', () => { isDragging = true; document.body.style.cursor = 'row-resize'; });
  on(document, 'mouseup', () => { isDragging = false; document.body.style.cursor = ''; });
  on(document, 'mousemove', (e) => {
    if (!isDragging) return;
    const app = $('.app-body');
    const rect = app.getBoundingClientRect();
    const pct = ((e.clientY - rect.top) / rect.height) * 100;
    if (pct > 15 && pct < 85) {
      $('.request-section').style.flex = `0 0 ${pct}%`;
      $('.response-section').style.flex = `1`;
    }
  });

  // ===== Event Wiring =====
  async function init() {
    await openDB();

    initTabs('.sidebar-tab');
    initTabs('.req-tab');
    initTabs('.res-tab');

    on($('#sendBtn'), 'click', sendRequest);
    on($('#saveBtn'), 'click', () => {
      showModal('Save Request', '<div style="color:var(--text-tertiary);margin-bottom:10px">Choose a collection or create a new one.</div>', null, null);
      const body = $('#modalBody');
      dbGet('collections').then(colls => {
        body.innerHTML = '';
        if (colls.length === 0) {
          body.innerHTML = '<div style="color:var(--text-tertiary)">No collections yet. Create one first.</div>';
        } else {
          colls.forEach(c => {
            const btn = document.createElement('button');
            btn.className = 'btn-secondary';
            btn.style.cssText = 'width:100%;margin-bottom:6px;justify-content:flex-start;';
            btn.textContent = c.name;
            on(btn, 'click', () => { addRequestToCollection(c.id); $('#modalOverlay').classList.remove('open'); });
            body.appendChild(btn);
          });
        }
        const cancel = document.createElement('button');
        cancel.className = 'btn-secondary';
        cancel.textContent = 'Cancel';
        cancel.style.marginTop = '10px';
        on(cancel, 'click', () => $('#modalOverlay').classList.remove('open'));
        body.appendChild(cancel);
      });
    });

    on($('#addParamBtn'), 'click', () => $('#paramsList').appendChild(createKvRow()));
    on($('#addHeaderBtn'), 'click', () => $('#headersList').appendChild(createKvRow()));
    on($('#formatJsonBtn'), 'click', () => {
      try {
        $('#bodyEditor').value = JSON.stringify(JSON.parse($('#bodyEditor').value), null, 2);
      } catch { toast('Invalid JSON', 'error'); }
    });
    on($('#authType'), 'change', renderAuthFields);

    on($('#newCollectionBtn'), 'click', () => {
      const body = document.createElement('div');
      body.innerHTML = '<input type="text" id="newCollName" placeholder="Collection name">';
      showModal('New Collection', body, async () => {
        const name = $('#newCollName').value.trim();
        if (!name) return;
        await dbPut('collections', { name, timestamp: Date.now() });
        await renderCollections();
        toast('Collection created', 'success');
      });
    });

    on($('#clearHistoryBtn'), 'click', async () => {
      showModal('Clear History', 'Delete all history entries? This cannot be undone.', async () => {
        await dbClear('history');
        await renderHistory();
        toast('History cleared', 'info');
      });
    });

    on($('#newEnvBtn'), 'click', () => {
      const body = document.createElement('div');
      body.innerHTML = `
        <input type="text" id="newEnvName" placeholder="Environment name (e.g. Production)">
        <textarea id="newEnvVars" placeholder="VAR_NAME=value&#10;API_KEY=secret123&#10;BASE_URL=https://api.example.com"></textarea>
      `;
      showModal('New Environment', body, async () => {
        const name = $('#newEnvName').value.trim();
        if (!name) return;
        const vars = {};
        ($('#newEnvVars').value || '').split('\n').forEach(line => {
          const eq = line.indexOf('=');
          if (eq > 0) vars[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
        });
        await dbPut('environments', { name, vars, timestamp: Date.now() });
        await renderEnvironments();
        toast('Environment created', 'success');
      });
    });

    on($('#exportBtn'), 'click', exportData);
    on($('#importBtn'), 'click', () => $('#fileInput').click());
    on($('#fileInput'), 'change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.name.endsWith('.postman_collection.json')) importPostman(file);
      else importData(file);
      e.target.value = '';
    });

    on($('#copyResponseBtn'), 'click', () => {
      if (window._lastResponse) {
        navigator.clipboard.writeText(window._lastResponse.text).then(() => toast('Copied to clipboard', 'success'));
      }
    });

    on($('#downloadResponseBtn'), 'click', () => {
      if (!window._lastResponse) return;
      const blob = new Blob([window._lastResponse.text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'response.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    on($('#themeToggle'), 'click', () => {
      const root = document.documentElement;
      const isLight = root.getAttribute('data-theme') === 'light';
      root.setAttribute('data-theme', isLight ? 'dark' : 'light');
    });

    // Res format toggle
    on($('#resFormat'), 'change', () => {
      if (!window._lastResponse) return;
      const fmt = $('#resFormat').value;
      const text = window._lastResponse.text;
      if (fmt === 'raw') {
        $('#responseBody').innerHTML = `<code class="language-json">${escapeHtml(text)}</code>`;
      } else if (fmt === 'preview') {
        $('#responseBody').innerHTML = `<iframe style="width:100%;height:100%;border:none;background:white;" srcdoc="${escapeHtml(text)}"></iframe>`;
      } else {
        try { $('#responseBody').innerHTML = '<div class="json-tree">' + renderJsonTree(JSON.parse(text)) + '</div>'; }
        catch { $('#responseBody').innerHTML = `<code class="language-json">${escapeHtml(text)}</code>`; }
      }
    });

    // Init auth fields
    renderAuthFields();

    // Render data
    await renderCollections();
    await renderHistory();
    await renderEnvironments();

    toast('Ghost Client ready — 100% offline', 'success');
  }

  init().catch(err => {
    console.error('Init error:', err);
    toast('Failed to initialize: ' + err.message, 'error');
  });
})();
