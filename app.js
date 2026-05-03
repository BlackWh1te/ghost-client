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
  function renderJsonTree(obj, autoExpand = false, level = 0, searchTerm = '', searchMode = 'ci') {
    if (obj === null) return '<span class="null">null</span>';
    const type = typeof obj;
    if (type === 'string') return `<span class="string">"${highlightText(escapeHtml(obj), searchTerm, searchMode)}"</span>`;
    if (type === 'number') return `<span class="number">${highlightText(obj.toString(), searchTerm, searchMode)}</span>`;
    if (type === 'boolean') return `<span class="boolean">${highlightText(obj.toString(), searchTerm, searchMode)}</span>`;

    if (Array.isArray(obj)) {
      if (obj.length === 0) return '<span class="boolean">[]</span>';
      const id = 'arr_' + Math.random().toString(36).slice(2);
      const cls = autoExpand ? 'expanded' : 'collapsed';
      let html = `<span class="${cls}" id="${id}"><span class="toggle" onclick="toggleJson('${id}')"></span><span class="boolean">[</span><span class="collapsible">`;
      obj.forEach((item, i) => {
        html += `<div class="indent">${renderJsonTree(item, autoExpand, level + 1, searchTerm, searchMode)}${i < obj.length - 1 ? '<span class="text-tertiary">,</span>' : ''}</div>`;
      });
      html += `</span><span class="boolean">]</span></span>`;
      return html;
    }

    const keys = Object.keys(obj);
    if (keys.length === 0) return '<span class="boolean">{}</span>';
    const id = 'obj_' + Math.random().toString(36).slice(2);
    const cls = autoExpand ? 'expanded' : 'collapsed';
    let html = `<span class="${cls}" id="${id}"><span class="toggle" onclick="toggleJson('${id}')"></span><span class="boolean">{</span><span class="collapsible">`;
    keys.forEach((key, i) => {
      html += `<div class="indent"><span class="key">"${highlightText(escapeHtml(key), searchTerm, searchMode)}"</span><span class="text-tertiary">: </span>${renderJsonTree(obj[key], autoExpand, level + 1, searchTerm, searchMode)}${i < keys.length - 1 ? '<span class="text-tertiary">,</span>' : ''}</div>`;
    });
    html += `</span><span class="boolean">}</span></span>`;
    return html;
  }

  function highlightText(text, term, mode = 'ci') {
    if (!term || !text) return text;
    let regex;
    if (mode === 'regex') {
      try {
        regex = new RegExp(`(${term})`, 'gi');
      } catch {
        regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
      }
    } else if (mode === 'cs') {
      regex = new RegExp(`(${escapeRegex(term)})`, 'g');
    } else {
      regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
    }
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

  function formatGraphQL(query) {
    // Simple GraphQL formatter - adds proper indentation
    let formatted = query.trim();
    let indent = 0;
    const result = [];
    const tokens = formatted.split(/([\{\}\(\)\[\]])/);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i].trim();
      if (!token) continue;

      if (token === '{' || token === '(' || token === '[') {
        result.push(token);
        indent += 2;
        result.push('\n' + ' '.repeat(indent));
      } else if (token === '}' || token === ')' || token === ']') {
        indent -= 2;
        result.push('\n' + ' '.repeat(indent) + token);
      } else {
        result.push(token);
      }
    }

    return result.join('').replace(/\n\s*\n/g, '\n');
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
    } else if (bodyType === 'graphql') {
      const query = substituteEnv($('#graphqlQuery').value.trim());
      let variables = {};
      const variablesStr = $('#graphqlVariables').value.trim();
      if (variablesStr) {
        try {
          variables = JSON.parse(substituteEnv(variablesStr));
        } catch (e) {
          toast('Invalid GraphQL variables JSON', 'error');
          return;
        }
      }
      if (query) {
        body = JSON.stringify({ query, variables });
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
      const timeoutMs = Math.max(1000, parseInt($('#timeoutInput').value || '30', 10) * 1000);
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
      $('#responseTime').textContent = localStorage.getItem('gc-time-ms') === 'true' ? elapsed + ' ms' : (elapsed / 1000).toFixed(2) + ' s';
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
        const indent = localStorage.getItem('gc-json-indent') === '4' ? 4 : 2;
        try { formatted = JSON.stringify(JSON.parse(responseText), null, indent); } catch {}
      }

      try {
        const searchTerm = $('#resSearch').value.trim();
        const searchMode = $('#searchOptions') ? $('#searchOptions').value : 'ci';
        $('#responseBody').innerHTML = '<div class="json-tree">' + renderJsonTree(JSON.parse(responseText), localStorage.getItem('gc-auto-expand') === 'true', 0, searchTerm, searchMode) + '</div>';
      } catch {
        $('#responseBody').innerHTML = `<code class="language-json">${escapeHtml(responseText)}</code>`;
      }
      window._lastResponse = { text: responseText, headers: resHeaders, status: code, statusText: response.statusText, time: elapsed, size };

      // Save to history
      if (localStorage.getItem('gc-auto-save') !== 'false') {
        let bodyData = null;
        if (bodyType === 'graphql') {
          bodyData = {
            query: $('#graphqlQuery').value,
            variables: $('#graphqlVariables').value
          };
        } else if (bodyType !== 'none') {
          bodyData = $('#bodyEditor').value;
        }

        await saveHistory({
        method,
        url: rawUrl,
        headers: getKvData($('#headersList')),
        params,
        body: bodyData,
        bodyType,
        authType,
        authConfig: getAuthConfig(),
        status: code,
        time: elapsed,
        timestamp: Date.now(),
      });
      await renderHistory();

      toast(`Response received: ${code} in ${elapsed}ms`, code < 300 ? 'success' : 'info');

      // Sound notification
      if (localStorage.getItem('gc-sound-notify') === 'true') {
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = code < 300 ? 800 : 400;
          gain.gain.value = 0.1;
          osc.start();
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
          osc.stop(ctx.currentTime + 0.1);
        } catch {}
      }
    } catch (err) {
      const isTimeout = err.name === 'AbortError';
      const errorMsg = isTimeout ? 'Request timeout' : err.message;
      $('#statusCode').textContent = isTimeout ? 'TIME' : 'ERR';
      $('#statusCode').className = 'status-code error';
      $('#statusText').textContent = errorMsg;
      $('#responseBody').innerHTML = `
        <div style="padding:16px;font-family:var(--font-sans)">
          <div style="color:var(--accent-red);font-weight:600;margin-bottom:8px">Request Failed</div>
          <div style="color:var(--text-secondary);font-size:12px;margin-bottom:16px">${escapeHtml(errorMsg)}</div>
          <button class="btn-small" id="retryBtn" style="display:inline-flex;align-items:center;gap:4px">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
            Retry Request
          </button>
        </div>`;
      on($('#retryBtn'), 'click', () => sendRequest());
      toast(errorMsg, 'error');
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
    const limit = parseInt(localStorage.getItem('gc-history-limit') || '100', 10);
    const all = await dbGet('history');
    if (all.length >= limit) {
      const oldest = all.sort((a, b) => a.timestamp - b.timestamp)[0];
      await dbDelete('history', oldest.id);
    }
    await dbPut('history', entry);
  }

  async function renderHistory() {
    const container = $('#historyList');
    let items = await dbGet('history');
    const sortBy = localStorage.getItem('gc-history-sort') || 'time';
    if (sortBy === 'name') items.sort((a, b) => a.url.localeCompare(b.url));
    else items.sort((a, b) => b.timestamp - a.timestamp);
    
    // Apply filter
    const filter = $('#historyFilter').value.trim().toLowerCase();
    if (filter) {
      items = items.filter(item => 
        item.method.toLowerCase().includes(filter) ||
        item.url.toLowerCase().includes(filter) ||
        (item.status && item.status.toString().includes(filter))
      );
    }
    
    container.innerHTML = '';
    if (items.length === 0) {
      container.innerHTML = '<div class="empty-state"><div>' + (filter ? 'No matching history items' : 'Send your first request to see history here') + '</div></div>';
      return;
    }
    const tsFormat = localStorage.getItem('gc-timestamps') || 'relative';
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'hist-item';
      el.innerHTML = `
        <span class="hist-method ${item.method.toLowerCase()}">${item.method}</span>
        <span class="hist-url">${escapeHtml(truncate(item.url, 35))}</span>
        <span style="font-size:10px;color:var(--text-muted)">${formatTime(item.timestamp, tsFormat)}</span>
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
    restoreRequestBody(item);
    setAuthConfig(item.authConfig || { type: 'none' });
  }

  function truncate(s, n) { return s.length > n ? s.slice(0, n) + '...' : s; }

  function restoreRequestBody(item) {
    $('#bodyType').value = item.bodyType || 'none';

    // Handle body restoration
    if (item.bodyType === 'graphql') {
      if (item.body && typeof item.body === 'object') {
        $('#graphqlQuery').value = item.body.query || '';
        $('#graphqlVariables').value = item.body.variables || '{}';
      } else {
        $('#graphqlQuery').value = '';
        $('#graphqlVariables').value = '{}';
      }
      // Trigger body type change to show GraphQL editor
      $('#bodyType').dispatchEvent(new Event('change'));
    } else {
      $('#bodyEditor').value = item.body || '';
    }
  }

  function formatTime(ts, format = 'relative') {
    const d = new Date(ts);
    if (format === 'absolute') return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
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
        r.innerHTML = `
          <span class="hist-method ${req.method.toLowerCase()}">${req.method}</span>
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(req.name)}</span>
          <span class="coll-req-actions" style="display:none;gap:4px">
            <button class="coll-action-btn" data-action="dup" title="Duplicate">⧉</button>
            <button class="coll-action-btn" data-action="ren" title="Rename">✎</button>
            <button class="coll-action-btn" data-action="del" title="Delete">×</button>
          </span>
        `;

        // Show/hide actions on hover
        r.addEventListener('mouseenter', () => {
          const actions = r.querySelector('.coll-req-actions');
          if (actions) actions.style.display = 'flex';
        });
        r.addEventListener('mouseleave', () => {
          const actions = r.querySelector('.coll-req-actions');
          if (actions) actions.style.display = 'none';
        });

        on(r, 'click', (e) => {
          if (e.target.closest('.coll-action-btn')) return;
          loadRequest(req);
          currentRequestId = req.id;
          renderCollections();
        });

        // Duplicate action
        on(r.querySelector('[data-action="dup"]'), 'click', async (e) => {
          e.stopPropagation();
          const dupReq = { ...req };
          dupReq.id = undefined;
          dupReq.name = req.name + ' (copy)';
          dupReq.timestamp = Date.now();
          await dbPut('requests', dupReq);
          await renderCollections();
          toast('Request duplicated', 'success');
        });

        // Rename action
        on(r.querySelector('[data-action="ren"]'), 'click', async (e) => {
          e.stopPropagation();
          const body = document.createElement('div');
          body.innerHTML = `<input type="text" id="renameReqInput" value="${escapeHtml(req.name)}" style="width:100%;padding:8px;font-size:13px;">`;
          showModal('Rename Request', body, async () => {
            const newName = $('#renameReqInput').value.trim();
            if (!newName) return;
            req.name = newName;
            await dbPut('requests', req);
            await renderCollections();
            toast('Request renamed', 'success');
          });
        });

        // Delete action
        on(r.querySelector('[data-action="del"]'), 'click', async (e) => {
          e.stopPropagation();
          showModal('Delete Request', `Delete "${req.name}"?`, async () => {
            await dbDelete('requests', req.id);
            if (currentRequestId === req.id) currentRequestId = null;
            await renderCollections();
            toast('Request deleted', 'info');
          });
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

      // Handle body data based on type
      let bodyData = null;
      const bodyType = $('#bodyType').value;
      if (bodyType === 'graphql') {
        bodyData = {
          query: $('#graphqlQuery').value,
          variables: $('#graphqlVariables').value
        };
      } else if (bodyType !== 'none') {
        bodyData = $('#bodyEditor').value;
      }

      const req = {
        name,
        collectionId: collId,
        method: $('#httpMethod').value,
        url: $('#requestUrl').value,
        headers: getKvData($('#headersList')),
        params: getKvData($('#paramsList')),
        bodyType,
        body: bodyData,
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
    restoreRequestBody(req);
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

    // Body type switching
    on($('#bodyType'), 'change', () => {
      const type = $('#bodyType').value;
      if (type === 'graphql') {
        $('#bodyEditor').style.display = 'none';
        $('#graphqlEditor').style.display = 'flex';
        $('#formatJsonBtn').style.display = 'none';
      } else {
        $('#bodyEditor').style.display = 'block';
        $('#graphqlEditor').style.display = 'none';
        $('#formatJsonBtn').style.display = 'inline-block';
      }
    });

    // GraphQL format button
    on($('#formatGraphqlBtn'), 'click', () => {
      try {
        $('#graphqlQuery').value = formatGraphQL($('#graphqlQuery').value);
        try {
          $('#graphqlVariables').value = JSON.stringify(JSON.parse($('#graphqlVariables').value), null, 2);
        } catch { /* Variables might be empty, that's ok */ }
        toast('GraphQL formatted', 'success');
      } catch { toast('Error formatting GraphQL', 'error'); }
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

    on($('#historyFilter'), 'input', () => {
      renderHistory();
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

    on($('#copyCurlBtn'), 'click', () => {
      const method = $('#httpMethod').value;
      const url = $('#requestUrl').value.trim();
      const headers = getKvData($('#headersList'));
      let body = null;
      const bodyType = $('#bodyType').value;
      if (bodyType === 'graphql') {
        const query = $('#graphqlQuery').value.trim();
        const variables = $('#graphqlVariables').value.trim();
        if (query) {
          try {
            body = JSON.stringify({ query, variables: variables ? JSON.parse(variables) : {} });
          } catch {
            body = JSON.stringify({ query, variables: {} });
          }
        }
      } else if (bodyType !== 'none') {
        body = $('#bodyEditor').value.trim();
      }

      let cmd = `curl -X ${method} "${url}"`;
      Object.entries(headers).forEach(([k, v]) => { cmd += `\\n  -H "${k}: ${v}"`; });
      if (body && method !== 'GET' && method !== 'HEAD') cmd += `\\n  -d '${body.replace(/'/g, "'\\''")}'`;

      navigator.clipboard.writeText(cmd).then(() => toast('cURL copied to clipboard', 'success'));
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

    on($('#settingsBtn'), 'click', () => {
      const body = document.createElement('div');
      body.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:20px;max-height:580px;overflow-y:auto;padding-right:12px;">
          
          <div>
            <label style="display:block;font-size:11px;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:8px">Appearance</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div>
                <label style="display:block;font-size:12px;margin-bottom:4px">Theme</label>
                <select id="settingsTheme" style="width:100%;padding:6px 10px;font-size:12px;border:1px solid var(--border-default);border-radius:var(--radius-sm);background:var(--bg-elevated);color:var(--text-primary);outline:none;cursor:pointer;">
                  <option value="system">System</option>
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </div>
              <div>
                <label style="display:block;font-size:12px;margin-bottom:4px">Compact Mode</label>
                <select id="settingsCompact" style="width:100%;padding:6px 10px;font-size:12px;border:1px solid var(--border-default);border-radius:var(--radius-sm);background:var(--bg-elevated);color:var(--text-primary);outline:none;cursor:pointer;">
                  <option value="false">Normal</option>
                  <option value="true">Compact</option>
                </select>
              </div>
              <div>
                <label style="display:block;font-size:12px;margin-bottom:4px">Response Font Size: <span id="fontSizeVal">12</span>px</label>
                <input type="range" id="settingsFontSize" min="10" max="22" value="12" style="width:100%;accent-color:var(--accent-indigo);">
              </div>
              <div>
                <label style="display:block;font-size:12px;margin-bottom:4px">Sidebar Width</label>
                <input type="number" id="settingsSidebarWidth" min="180" max="400" step="10" style="width:100%;padding:6px 10px;font-size:12px;border:1px solid var(--border-default);border-radius:var(--radius-sm);background:var(--bg-elevated);color:var(--text-primary);outline:none;font-family:var(--font-mono;">
              </div>
              <div>
                <label style="display:block;font-size:12px;margin-bottom:4px">Panel Split (%)</label>
                <input type="range" id="settingsPanelSplit" min="30" max="70" value="50" style="width:100%;accent-color:var(--accent-indigo;">
                <div style="text-align:center;font-size:11px;color:var(--text-tertiary)"><span id="panelSplitVal">50</span>%</div>
              </div>
              <div>
                <label style="display:block;font-size:12px;margin-bottom:4px">Font Family</label>
                <select id="settingsFontFamily" style="width:100%;padding:6px 10px;font-size:12px;border:1px solid var(--border-default);border-radius:var(--radius-sm);background:var(--bg-elevated);color:var(--text-primary);outline:none;cursor:pointer;">
                  <option value="mono">Monospace</option>
                  <option value="sans">Sans-serif</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label style="display:block;font-size:11px;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:8px">Requests</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div>
                <label style="display:block;font-size:12px;margin-bottom:4px">Default Timeout (s)</label>
                <input type="number" id="settingsTimeout" value="${$('#timeoutInput').value}" min="1" max="600" style="width:100%;padding:6px 10px;font-size:12px;border:1px solid var(--border-default);border-radius:var(--radius-sm);background:var(--bg-elevated);color:var(--text-primary);outline:none;font-family:var(--font-mono;">
              </div>
              <div>
                <label style="display:block;font-size:12px;margin-bottom:4px">Default Method</label>
                <select id="settingsDefaultMethod" style="width:100%;padding:6px 10px;font-size:12px;border:1px solid var(--border-default);border-radius:var(--radius-sm);background:var(--bg-elevated);color:var(--text-primary);outline:none;cursor:pointer;">
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
              <div>
                <label style="display:block;font-size:12px;margin-bottom:4px">History Limit</label>
                <input type="number" id="settingsHistoryLimit" min="10" max="1000" step="10" style="width:100%;padding:6px 10px;font-size:12px;border:1px solid var(--border-default);border-radius:var(--radius-sm);background:var(--bg-elevated);color:var(--text-primary);outline:none;font-family:var(--font-mono;">
              </div>
              <div>
                <label style="display:block;font-size:12px;margin-bottom:4px">Default Body Type</label>
                <select id="settingsDefaultBody" style="width:100%;padding:6px 10px;font-size:12px;border:1px solid var(--border-default);border-radius:var(--radius-sm);background:var(--bg-elevated);color:var(--text-primary);outline:none;cursor:pointer;">
                  <option value="none">None</option>
                  <option value="json">JSON</option>
                  <option value="graphql">GraphQL</option>
                  <option value="form">Form Data</option>
                  <option value="text">Plain Text</option>
                </select>
              </div>
              <div>
                <label style="display:block;font-size:12px;margin-bottom:4px">Default Auth</label>
                <select id="settingsDefaultAuth" style="width:100%;padding:6px 10px;font-size:12px;border:1px solid var(--border-default);border-radius:var(--radius-sm);background:var(--bg-elevated);color:var(--text-primary);outline:none;cursor:pointer;">
                  <option value="none">None</option>
                  <option value="bearer">Bearer</option>
                  <option value="basic">Basic</option>
                  <option value="apikey">API Key</option>
                </select>
              </div>
              <div style="grid-column:span 2">
                <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;">
                  <input type="checkbox" id="settingsAutoSave" style="accent-color:var(--accent-indigo);">
                  Auto-save every request to history
                </label>
              </div>
            </div>
          </div>

          <div>
            <label style="display:block;font-size:11px;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:8px">Responses</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div>
                <label style="display:block;font-size:12px;margin-bottom:4px">Default View</label>
                <select id="settingsResView" style="width:100%;padding:6px 10px;font-size:12px;border:1px solid var(--border-default);border-radius:var(--radius-sm);background:var(--bg-elevated);color:var(--text-primary);outline:none;cursor:pointer;">
                  <option value="pretty">Pretty</option>
                  <option value="raw">Raw</option>
                </select>
              </div>
              <div>
                <label style="display:block;font-size:12px;margin-bottom:4px">JSON Indent</label>
                <input type="number" id="settingsJsonIndent" min="2" max="8" step="2" style="width:100%;padding:6px 10px;font-size:12px;border:1px solid var(--border-default);border-radius:var(--radius-sm);background:var(--bg-elevated);color:var(--text-primary);outline:none;font-family:var(--font-mono;">
              </div>
              <div style="grid-column:span 2">
                <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;">
                  <input type="checkbox" id="settingsAutoFormat" style="accent-color:var(--accent-indigo);">
                  Auto-format JSON on response
                </label>
              </div>
              <div style="grid-column:span 2">
                <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;">
                  <input type="checkbox" id="settingsAutoExpand" style="accent-color:var(--accent-indigo);">
                  Auto-expand JSON tree
                </label>
              </div>
              <div style="grid-column:span 2">
                <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;">
                  <input type="checkbox" id="settingsLineNumbers" style="accent-color:var(--accent-indigo);">
                  Show line numbers in response
                </label>
              </div>
              <div style="grid-column:span 2">
                <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;">
                  <input type="checkbox" id="settingsWordWrap" style="accent-color:var(--accent-indigo);">
                  Word wrap in response
                </label>
              </div>
              <div style="grid-column:span 2">
                <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;">
                  <input type="checkbox" id="settingsSoundNotify" style="accent-color:var(--accent-indigo);">
                  Sound notification on request
                </label>
              </div>
              <div style="grid-column:span 2">
                <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;">
                  <input type="checkbox" id="settingsTimeMs" style="accent-color:var(--accent-indigo);">
                  Show response time in milliseconds
                </label>
              </div>
            </div>
          </div>

          <div>
            <label style="display:block;font-size:11px;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:8px">History & Collections</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div>
                <label style="display:block;font-size:12px;margin-bottom:4px">Sort History By</label>
                <select id="settingsHistorySort" style="width:100%;padding:6px 10px;font-size:12px;border:1px solid var(--border-default);border-radius:var(--radius-sm);background:var(--bg-elevated);color:var(--text-primary);outline:none;cursor:pointer;">
                  <option value="time">Most Recent</option>
                  <option value="name">Name</option>
                </select>
              </div>
              <div>
                <label style="display:block;font-size:12px;margin-bottom:4px">Show Timestamps</label>
                <select id="settingsTimestamps" style="width:100%;padding:6px 10px;font-size:12px;border:1px solid var(--border-default);border-radius:var(--radius-sm);background:var(--bg-elevated);color:var(--text-primary);outline:none;cursor:pointer;">
                  <option value="relative">Relative (5m ago)</option>
                  <option value="absolute">Absolute (2025-05-03)</option>
                </select>
              </div>
              <div style="grid-column:span 2">
                <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;">
                  <input type="checkbox" id="settingsCollapseSidebar" style="accent-color:var(--accent-indigo);">
                  Start with sidebar collapsed
                </label>
              </div>
            </div>
          </div>

          <div style="border-top:1px solid var(--border-subtle);padding-top:16px;">
            <label style="display:block;font-size:11px;font-weight:600;color:var(--accent-red);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:8px">Danger Zone</label>
            <div style="display:flex;gap:8px;">
              <button class="btn-small" id="settingsClearHistory" style="flex:1;border-color:var(--accent-orange);color:var(--accent-orange);">Clear History</button>
              <button class="btn-small" id="settingsClearCollections" style="flex:1;border-color:var(--accent-orange);color:var(--accent-orange);">Clear Collections</button>
              <button class="btn-small" id="settingsClearAll" style="flex:1;border-color:var(--accent-red);color:var(--accent-red);">Clear All Data</button>
            </div>
          </div>

          <div>
            <label style="display:block;font-size:11px;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:8px">Keyboard Shortcuts</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11px;color:var(--text-secondary);">
              <div><kbd style="background:var(--bg-elevated);padding:2px 6px;border-radius:4px;border:1px solid var(--border-default);font-family:var(--font-mono);">Ctrl+Enter</kbd> Send request</div>
              <div><kbd style="background:var(--bg-elevated);padding:2px 6px;border-radius:4px;border:1px solid var(--border-default);font-family:var(--font-mono);">Ctrl+S</kbd> Save to collection</div>
              <div><kbd style="background:var(--bg-elevated);padding:2px 6px;border-radius:4px;border:1px solid var(--border-default);font-family:var(--font-mono);">Ctrl+K</kbd> Focus URL bar</div>
              <div><kbd style="background:var(--bg-elevated);padding:2px 6px;border-radius:4px;border:1px solid var(--border-default);font-family:var(--font-mono);">Ctrl+/</kbd> Toggle theme</div>
              <div><kbd style="background:var(--bg-elevated);padding:2px 6px;border-radius:4px;border:1px solid var(--border-default);font-family:var(--font-mono);">Ctrl+1-4</kbd> Sidebar tabs</div>
            </div>
          </div>

          <div style="border-top:1px solid var(--border-subtle);padding-top:12px;font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between;">
            <span>Ghost Client v1.0 &middot; 100% client-side</span>
            <span id="dbSize">Calculating...</span>
          </div>
        </div>
      `;

      showModal('Settings', body);

      // Calculate DB size
      if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(estimate => {
          const usage = (estimate.usage / 1024 / 1024).toFixed(2);
          document.getElementById('dbSize').textContent = usage + ' MB used';
        }).catch(() => {
          document.getElementById('dbSize').textContent = 'Size unavailable';
        });
      }

      // Theme handler
      const themeSel = body.querySelector('#settingsTheme');
      const savedTheme = localStorage.getItem('gc-theme') || 'system';
      themeSel.value = savedTheme;
      on(themeSel, 'change', () => {
        const val = themeSel.value;
        localStorage.setItem('gc-theme', val);
        if (val === 'system') {
          document.documentElement.removeAttribute('data-theme');
        } else {
          document.documentElement.setAttribute('data-theme', val);
        }
      });

      // Compact mode handler
      const compactSel = body.querySelector('#settingsCompact');
      const savedCompact = localStorage.getItem('gc-compact') === 'true';
      compactSel.value = savedCompact ? 'true' : 'false';
      on(compactSel, 'change', () => {
        const isCompact = compactSel.value === 'true';
        localStorage.setItem('gc-compact', isCompact);
        document.body.style.fontSize = isCompact ? '11px' : '';
        document.querySelectorAll('.url-bar, .request-tabs, .response-header').forEach(el => {
          el.style.padding = isCompact ? '8px 12px' : '';
        });
      });

      // Font size handler
      const fsRange = body.querySelector('#settingsFontSize');
      const fsVal = body.querySelector('#fontSizeVal');
      const savedFs = localStorage.getItem('gc-fontsize');
      if (savedFs) { fsRange.value = savedFs; fsVal.textContent = savedFs; }
      on(fsRange, 'input', () => {
        const val = fsRange.value;
        fsVal.textContent = val;
        document.querySelectorAll('.response-body, .json-tree, .code-gen-body').forEach(el => { el.style.fontSize = val + 'px'; });
        localStorage.setItem('gc-fontsize', val);
      });

      // Sidebar width handler
      const sbWidth = body.querySelector('#settingsSidebarWidth');
      const savedSbWidth = localStorage.getItem('gc-sidebar-width') || '260';
      sbWidth.value = savedSbWidth;
      on(sbWidth, 'change', () => {
        const val = sbWidth.value;
        document.querySelector('.sidebar').style.width = val + 'px';
        localStorage.setItem('gc-sidebar-width', val);
      });

      // Panel split handler
      const panelSplit = body.querySelector('#settingsPanelSplit');
      const panelSplitVal = body.querySelector('#panelSplitVal');
      const savedSplit = localStorage.getItem('gc-panel-split') || '50';
      panelSplit.value = savedSplit;
      panelSplitVal.textContent = savedSplit;
      on(panelSplit, 'input', () => {
        const val = panelSplit.value;
        panelSplitVal.textContent = val;
        $('.request-section').style.flex = `0 0 ${val}%`;
        localStorage.setItem('gc-panel-split', val);
      });

      // Font family handler
      const ffSel = body.querySelector('#settingsFontFamily');
      const savedFF = localStorage.getItem('gc-font-family') || 'mono';
      ffSel.value = savedFF;
      on(ffSel, 'change', () => {
        const val = ffSel.value;
        const family = val === 'mono' ? 'var(--font-mono)' : 'var(--font-sans)';
        document.querySelectorAll('.response-body, .json-tree, .code-gen-body, .body-editor').forEach(el => { el.style.fontFamily = family; });
        localStorage.setItem('gc-font-family', val);
      });

      // Timeout handler
      const toInput = body.querySelector('#settingsTimeout');
      on(toInput, 'change', () => {
        $('#timeoutInput').value = Math.max(1, Math.min(600, parseInt(toInput.value || '30', 10)));
        localStorage.setItem('gc-timeout', $('#timeoutInput').value);
      });

      // Default method handler
      const defMethod = body.querySelector('#settingsDefaultMethod');
      const savedMethod = localStorage.getItem('gc-default-method') || 'GET';
      defMethod.value = savedMethod;
      on(defMethod, 'change', () => {
        localStorage.setItem('gc-default-method', defMethod.value);
        $('#httpMethod').value = defMethod.value;
      });

      // History limit handler
      const histLimit = body.querySelector('#settingsHistoryLimit');
      const savedLimit = localStorage.getItem('gc-history-limit') || '100';
      histLimit.value = savedLimit;
      on(histLimit, 'change', () => {
        localStorage.setItem('gc-history-limit', histLimit.value);
      });

      // Default body type handler
      const defBody = body.querySelector('#settingsDefaultBody');
      const savedBody = localStorage.getItem('gc-default-body') || 'json';
      defBody.value = savedBody;
      on(defBody, 'change', () => {
        localStorage.setItem('gc-default-body', defBody.value);
        $('#bodyType').value = defBody.value;
      });

      // Default auth handler
      const defAuth = body.querySelector('#settingsDefaultAuth');
      const savedAuth = localStorage.getItem('gc-default-auth') || 'none';
      defAuth.value = savedAuth;
      on(defAuth, 'change', () => {
        localStorage.setItem('gc-default-auth', defAuth.value);
        $('#authType').value = defAuth.value;
        renderAuthFields();
      });

      // Auto-save handler
      const autoSave = body.querySelector('#settingsAutoSave');
      const savedAutoSave = localStorage.getItem('gc-auto-save') === 'true';
      autoSave.checked = savedAutoSave;
      on(autoSave, 'change', () => {
        localStorage.setItem('gc-auto-save', autoSave.checked);
      });

      // Response view handler
      const resView = body.querySelector('#settingsResView');
      const savedView = localStorage.getItem('gc-res-view') || 'pretty';
      resView.value = savedView;
      on(resView, 'change', () => {
        localStorage.setItem('gc-res-view', resView.value);
        $('#resFormat').value = resView.value;
      });

      // JSON indent handler
      const jsonIndent = body.querySelector('#settingsJsonIndent');
      const savedIndent = localStorage.getItem('gc-json-indent') || '2';
      jsonIndent.value = savedIndent;
      on(jsonIndent, 'change', () => {
        localStorage.setItem('gc-json-indent', jsonIndent.value);
      });

      // Auto-format handler
      const autoFmt = body.querySelector('#settingsAutoFormat');
      const savedAutoFmt = localStorage.getItem('gc-auto-format') === 'true';
      autoFmt.checked = savedAutoFmt;
      on(autoFmt, 'change', () => {
        localStorage.setItem('gc-auto-format', autoFmt.checked);
      });

      // Auto-expand handler
      const autoExpand = body.querySelector('#settingsAutoExpand');
      const savedExpand = localStorage.getItem('gc-auto-expand') === 'true';
      autoExpand.checked = savedExpand;
      on(autoExpand, 'change', () => {
        localStorage.setItem('gc-auto-expand', autoExpand.checked);
      });

      // Line numbers handler
      const lineNums = body.querySelector('#settingsLineNumbers');
      const savedLineNums = localStorage.getItem('gc-line-numbers') === 'true';
      lineNums.checked = savedLineNums;
      on(lineNums, 'change', () => {
        localStorage.setItem('gc-line-numbers', lineNums.checked);
      });

      // Word wrap handler
      const wordWrap = body.querySelector('#settingsWordWrap');
      const savedWrap = localStorage.getItem('gc-word-wrap') === 'true';
      wordWrap.checked = savedWrap;
      on(wordWrap, 'change', () => {
        localStorage.setItem('gc-word-wrap', wordWrap.checked);
        document.querySelectorAll('.response-body').forEach(el => { el.style.whiteSpace = wordWrap.checked ? 'pre-wrap' : 'pre'; });
      });

      // Sound notification handler
      const soundNotify = body.querySelector('#settingsSoundNotify');
      const savedSound = localStorage.getItem('gc-sound-notify') === 'true';
      soundNotify.checked = savedSound;
      on(soundNotify, 'change', () => {
        localStorage.setItem('gc-sound-notify', soundNotify.checked);
      });

      // Time in ms handler
      const timeMs = body.querySelector('#settingsTimeMs');
      const savedTimeMs = localStorage.getItem('gc-time-ms') === 'true';
      timeMs.checked = savedTimeMs;
      on(timeMs, 'change', () => {
        localStorage.setItem('gc-time-ms', timeMs.checked);
      });

      // History sort handler
      const histSort = body.querySelector('#settingsHistorySort');
      const savedSort = localStorage.getItem('gc-history-sort') || 'time';
      histSort.value = savedSort;
      on(histSort, 'change', () => {
        localStorage.setItem('gc-history-sort', histSort.value);
        renderHistory();
      });

      // Timestamps handler
      const timestamps = body.querySelector('#settingsTimestamps');
      const savedTs = localStorage.getItem('gc-timestamps') || 'relative';
      timestamps.value = savedTs;
      on(timestamps, 'change', () => {
        localStorage.setItem('gc-timestamps', timestamps.value);
        renderHistory();
      });

      // Collapse sidebar handler
      const collapseSidebar = body.querySelector('#settingsCollapseSidebar');
      const savedCollapse = localStorage.getItem('gc-collapse-sidebar') === 'true';
      collapseSidebar.checked = savedCollapse;
      on(collapseSidebar, 'change', () => {
        localStorage.setItem('gc-collapse-sidebar', collapseSidebar.checked);
      });

      // Clear history handler
      on(body.querySelector('#settingsClearHistory'), 'click', () => {
        showModal('Clear History', 'Delete all request history? This cannot be undone.', async () => {
          await dbClear('history');
          await renderHistory();
          toast('History cleared', 'info');
        });
      });

      // Clear collections handler
      on(body.querySelector('#settingsClearCollections'), 'click', () => {
        showModal('Clear Collections', 'Delete all collections and saved requests? This cannot be undone.', async () => {
          await dbClear('collections');
          await dbClear('requests');
          await renderCollections();
          toast('Collections cleared', 'info');
        });
      });

      // Clear all data handler
      on(body.querySelector('#settingsClearAll'), 'click', () => {
        showModal('Confirm Delete', 'This will erase ALL collections, requests, history, and environments. This cannot be undone.', async () => {
          await dbClear('collections');
          await dbClear('requests');
          await dbClear('history');
          await dbClear('environments');
          await renderCollections();
          await renderHistory();
          await renderEnvironments();
          toast('All data cleared', 'info');
        });
      });
    });

    // Apply saved settings on load
    (function applySettings() {
      const savedTheme = localStorage.getItem('gc-theme');
      if (savedTheme && savedTheme !== 'system') document.documentElement.setAttribute('data-theme', savedTheme);
      const savedTimeout = localStorage.getItem('gc-timeout');
      if (savedTimeout) $('#timeoutInput').value = savedTimeout;
      const savedFs = localStorage.getItem('gc-fontsize');
      if (savedFs) document.querySelectorAll('.response-body, .json-tree, .code-gen-body').forEach(el => { el.style.fontSize = savedFs + 'px'; });
      const savedSbWidth = localStorage.getItem('gc-sidebar-width');
      if (savedSbWidth) document.querySelector('.sidebar').style.width = savedSbWidth + 'px';
      const savedSplit = localStorage.getItem('gc-panel-split');
      if (savedSplit) { $('.request-section').style.flex = `0 0 ${savedSplit}%`; }
      const savedFF = localStorage.getItem('gc-font-family');
      if (savedFF === 'sans') document.querySelectorAll('.response-body, .json-tree, .code-gen-body, .body-editor').forEach(el => { el.style.fontFamily = 'var(--font-sans)'; });
      const savedMethod = localStorage.getItem('gc-default-method');
      if (savedMethod) $('#httpMethod').value = savedMethod;
      const savedBody = localStorage.getItem('gc-default-body');
      if (savedBody) $('#bodyType').value = savedBody;
      const savedAuth = localStorage.getItem('gc-default-auth');
      if (savedAuth) { $('#authType').value = savedAuth; renderAuthFields(); }
      const savedView = localStorage.getItem('gc-res-view');
      if (savedView) $('#resFormat').value = savedView;
      const savedCompact = localStorage.getItem('gc-compact') === 'true';
      if (savedCompact) document.body.style.fontSize = '11px';
      const savedWrap = localStorage.getItem('gc-word-wrap') === 'true';
      document.querySelectorAll('.response-body').forEach(el => { el.style.whiteSpace = savedWrap ? 'pre-wrap' : 'pre'; });
    })();

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
        const autoFmt = localStorage.getItem('gc-auto-format') === 'true';
        if (autoFmt) {
          try { text = JSON.stringify(JSON.parse(text), null, parseInt(localStorage.getItem('gc-json-indent') || '2', 10)); } catch {}
        }
        try {
          const searchTerm = $('#resSearch').value.trim();
          const searchMode = $('#searchOptions') ? $('#searchOptions').value : 'ci';
          $('#responseBody').innerHTML = '<div class="json-tree">' + renderJsonTree(JSON.parse(text), localStorage.getItem('gc-auto-expand') === 'true', 0, searchTerm, searchMode) + '</div>';
        } catch {
          $('#responseBody').innerHTML = `<code class="language-json">${escapeHtml(text)}</code>`;
        }
      }
    });

    // ===== New Feature Event Listeners =====
    on($('#genCodeBtn'), 'click', () => {
      const method = $('#httpMethod').value;
      const url = $('#requestUrl').value.trim();
      const headers = getKvData($('#headersList'));
      const bodyType = $('#bodyType').value;
      let body = null;
      if (bodyType === 'graphql') {
        const query = $('#graphqlQuery').value.trim();
        const variables = $('#graphqlVariables').value.trim();
        if (query) {
          try {
            body = JSON.stringify({ query, variables: variables ? JSON.parse(variables) : {} });
          } catch {
            body = JSON.stringify({ query, variables: {} });
          }
        }
      } else if (bodyType !== 'none') {
        body = $('#bodyEditor').value.trim();
      }
      const authType = $('#authType').value;

      const modalBody = document.createElement('div');
      const tabs = document.createElement('div');
      tabs.className = 'code-gen-tabs';
      const langs = ['cURL', 'Fetch', 'Axios', 'Python', 'Ruby', 'Go', 'PHP'];
      let activeLang = 'cURL';
      const bodies = {};

      function buildCode(lang) {
        if (lang === 'cURL') {
          let cmd = `curl -X ${method} "${url}"`;
          Object.entries(headers).forEach(([k, v]) => { cmd += `\\n  -H "${k}: ${v}"`; });
          if (body && method !== 'GET' && method !== 'HEAD') cmd += `\\n  -d '${body.replace(/'/g, "'\\''")}'`;
          return cmd;
        }
        if (lang === 'Fetch') {
          let code = `fetch("${url}", {\\n  method: "${method}",`;
          if (Object.keys(headers).length) code += `\\n  headers: ${JSON.stringify(headers, null, 2).replace(/\n/g, '\\n')},`;
          if (body && method !== 'GET' && method !== 'HEAD') code += `\\n  body: JSON.stringify(${body}),`;
          code += `\\n})\\n  .then(r => r.json())\\n  .then(data => console.log(data))\\n  .catch(err => console.error(err));`;
          return code;
        }
        if (lang === 'Axios') {
          let code = `axios.${method.toLowerCase()}("${url}"`;
          if (body && method !== 'GET' && method !== 'HEAD') code += `, ${body}`;
          if (Object.keys(headers).length) {
            code += `, {\\n  headers: ${JSON.stringify(headers, null, 2).replace(/\n/g, '\\n')}`;
            if (authType === 'bearer') code += `\\n    Authorization: 'Bearer YOUR_TOKEN'`;
            code += `\\n}`;
          }
          code += `)\\n  .then(r => console.log(r.data))\\n  .catch(err => console.error(err));`;
          return code;
        }
        if (lang === 'Python') {
          let code = `import requests\\n\\nresponse = requests.${method.toLowerCase()}("${url}"`;
          const opts = [];
          if (Object.keys(headers).length) opts.push(`headers=${JSON.stringify(headers)}`);
          if (body && method !== 'GET' && method !== 'HEAD') opts.push(`json=${body}`);
          if (opts.length) code += `, ${opts.join(', ')}`;
          code += `)\\nprint(response.status_code)\\nprint(response.json())`;
          return code;
        }
        if (lang === 'Ruby') {
          let code = `require 'net/http'\\nrequire 'json'\\nrequire 'uri'\\n\\nuri = URI("${url}")`;
          if (Object.keys(headers).length) {
            code += `\\nheaders = {\\n`;
            Object.entries(headers).forEach(([k, v], i) => {
              code += `  '${k}': '${v}'${i < Object.keys(headers).length - 1 ? ',' : ''}\\n`;
            });
            code += `}`;
          }
          code += `\\n\\nhttp = Net::HTTP.new(uri.host, uri.port)\\nhttp.use_ssl = (uri.scheme == 'https')\\n`;
          if (method !== 'GET') {
            code += `request = Net::HTTP::${method.capitalize}.new(uri.request_uri)\\n`;
            if (Object.keys(headers).length) code += `request.body = ${body}\\n`;
            if (Object.keys(headers).length) code += `headers.each { |k, v| request[k] = v }\\n`;
            code += `response = http.request(request)\\n`;
          } else {
            if (Object.keys(headers).length) code += `headers.each { |k, v| http[k] = v }\\n`;
            code += `response = http.get(uri.request_uri)\\n`;
          }
          code += `puts response.code\\nputs response.body`;
          return code;
        }
        if (lang === 'Go') {
          let code = `package main\\n\\nimport (\\n  "bytes"\\n  "encoding/json"\\n  "fmt"\\n  "io"\\n  "net/http"\\n  "strings"\\n)\\n\\nfunc main() {`;
          code += `\\n  url := "${url}"`;
          if (body && method !== 'GET' && method !== 'HEAD') {
            code += `\\n  payload := strings.NewReader(${body})`;
          }
          code += `\\n  req, _ := http.NewRequest("${method}", url, payload)`;
          if (Object.keys(headers).length) {
            code += `\\n  req.Header.Set("Content-Type", "application/json")`;
            Object.entries(headers).forEach(([k, v]) => {
              code += `\\n  req.Header.Set("${k}", "${v}")`;
            });
          }
          code += `\\n  client := &http.Client{}\\n  resp, err := client.Do(req)\\n  if err != nil {\\n    panic(err)\\n  }\\n  defer resp.Body.Close()\\n  body, _ := io.ReadAll(resp.Body)\\n  fmt.Println(resp.Status)\\n  fmt.Println(string(body))\\n}`;
          return code;
        }
        if (lang === 'PHP') {
          let code = `<?php\\n\\n$url = "${url}";`;
          if (Object.keys(headers).length) {
            code += `\\n$headers = array(`;
            Object.entries(headers).forEach(([k, v], i) => {
              code += `  '${k}: ${v}'${i < Object.keys(headers).length - 1 ? ',' : ''}\\n`;
            });
            code += `);`;
          }
          if (body && method !== 'GET' && method !== 'HEAD') {
            code += `\\n$data = ${body};`;
          }
          code += `\\n\\n$ch = curl_init();\\ncurl_setopt($ch, CURLOPT_URL, $url);`;
          if (method !== 'GET') {
            code += `\\ncurl_setopt($ch, CURLOPT_CUSTOMREQUEST, "${method}");`;
          }
          if (body && method !== 'GET' && method !== 'HEAD') {
            code += `\\ncurl_setopt($ch, CURLOPT_POSTFIELDS, $data);`;
          }
          if (Object.keys(headers).length) {
            code += `\\ncurl_setopt($ch, CURLOPT_HTTPHEADER, $headers);`;
          }
          code += `\\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\\n\\n$response = curl_exec($ch);\\n$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);\\ncurl_close($ch);\\n\\necho "HTTP Code: " . $httpCode . "\\n";\\necho $response;\\n?>`;
          return code;
        }
        return '';
      }

      langs.forEach(l => {
        const btn = document.createElement('button');
        btn.className = 'code-gen-tab' + (l === activeLang ? ' active' : '');
        btn.textContent = l;
        on(btn, 'click', () => {
          activeLang = l;
          tabs.querySelectorAll('.code-gen-tab').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          displayCode(buildCode(l));
        });
        tabs.appendChild(btn);
      });

      const display = document.createElement('pre');
      display.className = 'code-gen-body';
      function displayCode(code) { display.textContent = code; }
      displayCode(buildCode(activeLang));

      const copyBtn = document.createElement('button');
      copyBtn.className = 'btn-small';
      copyBtn.textContent = 'Copy';
      copyBtn.style.marginTop = '8px';
      on(copyBtn, 'click', () => {
        navigator.clipboard.writeText(display.textContent).then(() => toast('Code copied', 'success'));
      });

      modalBody.appendChild(tabs);
      modalBody.appendChild(display);
      modalBody.appendChild(copyBtn);
      showModal('Generate Code', modalBody);
    });

    on($('#importCurlBtn'), 'click', () => {
      const text = $('#curlImportInput').value.trim();
      if (!text) return;
      const parsed = parseCurl(text);
      if (parsed) {
        $('#httpMethod').value = parsed.method;
        $('#requestUrl').value = parsed.url;
        if (parsed.headers) setKvData($('#headersList'), parsed.headers);
        if (parsed.body) {
          $('#bodyType').value = 'raw';
          $('#bodyEditor').value = parsed.body;
        }
        toast('cURL imported', 'success');
        $('#curlImportInput').value = '';
      } else {
        toast('Could not parse cURL command', 'error');
      }
    });

    on($('#jwtInput'), 'input', () => {
      const token = $('#jwtInput').value.trim();
      if (!token) { $('#jwtOutput').innerHTML = ''; return; }
      try {
        const parts = token.split('.');
        if (parts.length !== 3) throw new Error('Invalid JWT');
        const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

        // Format header with better inspection
        let headerHtml = '<div class="jwt-section"><strong>Header</strong>';
        headerHtml += '<div class="jwt-field"><span class="jwt-key">alg:</span> <span class="jwt-val">' + (header.alg || 'unknown') + '</span></div>';
        headerHtml += '<div class="jwt-field"><span class="jwt-key">typ:</span> <span class="jwt-val">' + (header.typ || 'JWT') + '</span></div>';
        if (header.kid) headerHtml += '<div class="jwt-field"><span class="jwt-key">kid:</span> <span class="jwt-val">' + header.kid + '</span></div>';
        if (header.iss) headerHtml += '<div class="jwt-field"><span class="jwt-key">iss:</span> <span class="jwt-val">' + header.iss + '</span></div>';
        headerHtml += '</div>';

        // Format payload with better inspection
        let payloadHtml = '<div class="jwt-section"><strong>Payload</strong>';
        if (payload.iss) payloadHtml += '<div class="jwt-field"><span class="jwt-key">iss:</span> <span class="jwt-val">' + payload.iss + '</span></div>';
        if (payload.sub) payloadHtml += '<div class="jwt-field"><span class="jwt-key">sub:</span> <span class="jwt-val">' + payload.sub + '</span></div>';
        if (payload.aud) payloadHtml += '<div class="jwt-field"><span class="jwt-key">aud:</span> <span class="jwt-val">' + (Array.isArray(payload.aud) ? payload.aud.join(', ') : payload.aud) + '</span></div>';
        if (payload.exp) {
          const expDate = new Date(payload.exp * 1000);
          const isExpired = Date.now() > payload.exp * 1000;
          payloadHtml += '<div class="jwt-field"><span class="jwt-key">exp:</span> <span class="jwt-val" style="color:' + (isExpired ? 'var(--accent-red)' : 'var(--accent-green)') + '">' + expDate.toLocaleString() + (isExpired ? ' (EXPIRED)' : '') + '</span></div>';
        }
        if (payload.iat) {
          const iatDate = new Date(payload.iat * 1000);
          payloadHtml += '<div class="jwt-field"><span class="jwt-key">iat:</span> <span class="jwt-val">' + iatDate.toLocaleString() + '</span></div>';
        }
        if (payload.nbf) {
          const nbfDate = new Date(payload.nbf * 1000);
          payloadHtml += '<div class="jwt-field"><span class="jwt-key">nbf:</span> <span class="jwt-val">' + nbfDate.toLocaleString() + '</span></div>';
        }
        payloadHtml += '</div>';

        // Signature
        const sigHtml = '<div class="jwt-section"><strong>Signature</strong><div class="jwt-field"><span class="jwt-val">' + parts[2].slice(0, 32) + '...</span></div></div>';

        $('#jwtOutput').innerHTML = headerHtml + payloadHtml + sigHtml;
      } catch (e) {
        $('#jwtOutput').innerHTML = '<div class="jwt-error">Invalid JWT token: ' + e.message + '</div>';
      }
    });

    on($('#b64EncBtn'), 'click', () => {
      try { $('#b64Output').textContent = btoa($('#b64Input').value); } catch { $('#b64Output').textContent = 'Error: contains non-ASCII'; }
    });
    on($('#b64DecBtn'), 'click', () => {
      try { $('#b64Output').textContent = atob($('#b64Input').value); } catch { $('#b64Output').textContent = 'Invalid Base64'; }
    });

    on($('#urlEncBtn'), 'click', () => {
      $('#urlOutput').textContent = encodeURIComponent($('#urlInput').value);
    });
    on($('#urlDecBtn'), 'click', () => {
      try { $('#urlOutput').textContent = decodeURIComponent($('#urlInput').value); } catch { $('#urlOutput').textContent = 'Invalid URL encoding'; }
    });

    on($('#jsonDiffBtn'), 'click', () => {
      try {
        const a = JSON.parse($('#jsonDiffA').value || '{}');
        const b = JSON.parse($('#jsonDiffB').value || '{}');
        $('#jsonDiffOutput').innerHTML = renderDiff(a, b);
      } catch (e) {
        $('#jsonDiffOutput').textContent = 'Invalid JSON: ' + e.message;
      }
    });

    on($('#runCollectionBtn'), 'click', async () => {
      const collections = await dbGet('collections');
      if (!collections.length) { toast('No collections to run', 'info'); return; }
      const allReqs = await dbGet('requests');

      const modalBody = document.createElement('div');
      modalBody.style.maxHeight = '400px';
      modalBody.style.overflow = 'auto';

      // Add parallel execution option
      const optionsDiv = document.createElement('div');
      optionsDiv.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border-subtle);margin-bottom:8px;';
      optionsDiv.innerHTML = `
        <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;">
          <input type="checkbox" id="parallelRun" style="accent-color:var(--accent-indigo);">
          Run in parallel (faster, but may overload server)
        </label>
      `;
      modalBody.appendChild(optionsDiv);

      const resultsDiv = document.createElement('div');
      resultsDiv.innerHTML = '<div style="color:var(--text-tertiary);margin-bottom:8px">Running collection...</div>';
      modalBody.appendChild(resultsDiv);

      showModal('Collection Runner', modalBody, null, null);

      const parallel = document.getElementById('parallelRun').checked;
      let passCount = 0, failCount = 0;
      const total = allReqs.length;

      if (parallel) {
        // Parallel execution
        const promises = allReqs.map(async (req) => {
          try {
            const start = performance.now();
            const headers = req.headers || {};
            let body = null;
            if (req.body && req.bodyType !== 'none') {
              if (req.bodyType === 'graphql' && typeof req.body === 'object') {
                const variables = req.body.variables ? JSON.parse(req.body.variables) : {};
                body = JSON.stringify({ query: req.body.query, variables });
              } else {
                body = req.body;
              }
            }
            const cRunner = new AbortController();
            const tRunner = setTimeout(() => cRunner.abort(), 10000);
            const resp = await fetch(req.url, { method: req.method, headers, body, signal: cRunner.signal });
            clearTimeout(tRunner);
            const time = Math.round(performance.now() - start);
            const status = resp.status;
            const ok = status < 400;
            if (ok) passCount++; else failCount++;
            return { req, status: status, ok, time, error: null };
          } catch (err) {
            failCount++;
            return { req, status: 'ERR', ok: false, time: 0, error: err.message };
          }
        });

        const results = await Promise.all(promises);
        results.forEach(r => {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;gap:12px;padding:6px 0;border-bottom:1px solid var(--border-subtle);font-size:12px;';
          if (r.status === 'ERR') {
            row.innerHTML = `<span class="hist-method ${r.req.method.toLowerCase()}" style="flex-shrink:0">${r.req.method}</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(r.req.name)}</span><span style="color:var(--accent-red);font-weight:600">ERR</span>`;
          } else {
            row.innerHTML = `<span class="hist-method ${r.req.method.toLowerCase()}" style="flex-shrink:0">${r.req.method}</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(r.req.name)}</span><span style="color:${r.ok ? 'var(--accent-green)' : 'var(--accent-red)'};font-weight:600">${r.status}</span><span style="color:var(--text-muted);flex-shrink:0">${r.time}ms</span>`;
          }
          resultsDiv.appendChild(row);
        });
      } else {
        // Sequential execution
        for (const req of allReqs) {
          try {
            const start = performance.now();
            const headers = req.headers || {};
            let body = null;
            if (req.body && req.bodyType !== 'none') {
              if (req.bodyType === 'graphql' && typeof req.body === 'object') {
                const variables = req.body.variables ? JSON.parse(req.body.variables) : {};
                body = JSON.stringify({ query: req.body.query, variables });
              } else {
                body = req.body;
              }
            }
            const cRunner = new AbortController();
            const tRunner = setTimeout(() => cRunner.abort(), 10000);
            const resp = await fetch(req.url, { method: req.method, headers, body, signal: cRunner.signal });
            clearTimeout(tRunner);
            const time = Math.round(performance.now() - start);
            const status = resp.status;
            const ok = status < 400;
            if (ok) passCount++; else failCount++;
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;gap:12px;padding:6px 0;border-bottom:1px solid var(--border-subtle);font-size:12px;';
            row.innerHTML = `<span class="hist-method ${req.method.toLowerCase()}" style="flex-shrink:0">${req.method}</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(req.name)}</span><span style="color:${ok ? 'var(--accent-green)' : 'var(--accent-red)'};font-weight:600">${status}</span><span style="color:var(--text-muted);flex-shrink:0">${time}ms</span>`;
            resultsDiv.appendChild(row);
          } catch (err) {
            failCount++;
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;gap:12px;padding:6px 0;border-bottom:1px solid var(--border-subtle);font-size:12px;';
            row.innerHTML = `<span class="hist-method ${req.method.toLowerCase()}" style="flex-shrink:0">${req.method}</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(req.name)}</span><span style="color:var(--accent-red);font-weight:600">ERR</span>`;
            resultsDiv.appendChild(row);
          }
        }
      }

      const summary = document.createElement('div');
      summary.style.cssText = 'margin-top:10px;padding-top:10px;border-top:2px solid var(--border-default);font-size:13px;font-weight:600;';
      summary.innerHTML = `<span style="color:var(--accent-green)">${passCount} passed</span> · <span style="color:var(--accent-red)">${failCount} failed</span> · ${total} total${parallel ? ' (parallel)' : ' (sequential)'}`;
      resultsDiv.appendChild(summary);
    });

    on($('#resSearch'), 'input', () => {
      if (!window._lastResponse) return;
      const term = $('#resSearch').value.trim();
      const fmt = $('#resFormat').value;
      const text = window._lastResponse.text;
      const searchMode = $('#searchOptions') ? $('#searchOptions').value : 'ci';

      if (fmt === 'raw') {
        if (!term) {
          $('#responseBody').innerHTML = `<code class="language-json">${escapeHtml(text)}</code>`;
        } else {
          const lines = text.split('\n');
          let filtered;
          if (searchMode === 'cs') {
            filtered = lines.filter(l => l.includes(term));
          } else if (searchMode === 'regex') {
            try {
              const regex = new RegExp(term, 'i');
              filtered = lines.filter(l => regex.test(l));
            } catch {
              filtered = lines.filter(l => l.toLowerCase().includes(term.toLowerCase()));
            }
          } else {
            filtered = lines.filter(l => l.toLowerCase().includes(term.toLowerCase()));
          }
          $('#responseBody').innerHTML = `<code class="language-json">${escapeHtml(filtered.join('\n') || '// No matches')}</code>`;
        }
      } else if (fmt === 'preview') {
        $('#responseBody').innerHTML = `<iframe style="width:100%;height:100%;border:none;background:white;" srcdoc="${escapeHtml(text)}"></iframe>`;
      } else {
        try {
          $('#responseBody').innerHTML = '<div class="json-tree">' + renderJsonTree(JSON.parse(text), localStorage.getItem('gc-auto-expand') === 'true', 0, term, searchMode) + '</div>';
        } catch {
          $('#responseBody').innerHTML = `<code class="language-json">${escapeHtml(text)}</code>`;
        }
      }
    });

    on($('#searchOptions'), 'change', () => {
      if (!window._lastResponse) return;
      const term = $('#resSearch').value.trim();
      if (!term) return;
      // Trigger search again with new mode
      $('#resSearch').dispatchEvent(new Event('input'));
    });

    // Init auth fields
    renderAuthFields();

    // Render data
    await renderCollections();
    await renderHistory();
    await renderEnvironments();

    toast('Ghost Client ready — 100% offline', 'success');
  }

  // ===== Utility Functions =====
  function parseCurl(cmd) {
    const methodMatch = cmd.match(/-X\s+(\w+)/i) || cmd.match(/--request\s+(\w+)/i);
    const method = methodMatch ? methodMatch[1].toUpperCase() : 'GET';
    const urlMatch = cmd.match(/curl\s+(?:-[^\s]+\s+)*["']?([^"'\s]+)/);
    if (!urlMatch) return null;
    const url = urlMatch[1].replace(/^['"]|['"]$/g, '');
    const headers = {};
    const headerRegex = /-H\s+["']([^"']+)["']/g;
    let m;
    while ((m = headerRegex.exec(cmd)) !== null) {
      const parts = m[1].split(':');
      if (parts.length >= 2) headers[parts[0].trim()] = parts.slice(1).join(':').trim();
    }
    const dataMatch = cmd.match(/-d\s+["']([^"']+)["']/) || cmd.match(/--data\s+["']([^"']+)["']/) || cmd.match(/-d\s+(\{[^}]+\})/);
    const body = dataMatch ? dataMatch[1] : null;
    return { method, url, headers, body };
  }

  function renderDiff(a, b, path = '') {
    if (typeof a !== typeof b || (a === null) !== (b === null)) {
      return `<div class="diff-row diff-change"><div class="diff-path">${path || 'root'}</div><div class="diff-del">${JSON.stringify(a)}</div><div class="diff-add">${JSON.stringify(b)}</div></div>`;
    }
    if (a === null || typeof a !== 'object') {
      if (a === b) return `<div class="diff-row diff-same"><div class="diff-path">${path ? path + ': ' : ''}</div><div class="diff-val">${JSON.stringify(a)}</div></div>`;
      return `<div class="diff-row diff-change"><div class="diff-path">${path || 'root'}</div><div class="diff-del">${JSON.stringify(a)}</div><div class="diff-add">${JSON.stringify(b)}</div></div>`;
    }
    if (Array.isArray(a) !== Array.isArray(b)) {
      return `<div class="diff-row diff-change"><div class="diff-path">${path || 'root'}</div><div class="diff-del">${JSON.stringify(a)}</div><div class="diff-add">${JSON.stringify(b)}</div></div>`;
    }
    
    let html = '';
    const allKeys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
    
    if (Array.isArray(a)) {
      // Array diff
      const maxLen = Math.max(a.length, b.length);
      for (let i = 0; i < maxLen; i++) {
        const newPath = path ? `${path}[${i}]` : `[${i}]`;
        if (!(i < a.length)) {
          html += `<div class="diff-row diff-add"><div class="diff-path">${newPath}</div><div class="diff-val">${JSON.stringify(b[i])}</div></div>`;
        } else if (!(i < b.length)) {
          html += `<div class="diff-row diff-del"><div class="diff-path">${newPath}</div><div class="diff-val">${JSON.stringify(a[i])}</div></div>`;
        } else if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) {
          html += renderDiff(a[i], b[i], newPath);
        } else {
          html += `<div class="diff-row diff-same"><div class="diff-path">${newPath}</div><div class="diff-val">${JSON.stringify(a[i])}</div></div>`;
        }
      }
    } else {
      // Object diff
      allKeys.forEach(k => {
        const newPath = path ? `${path}.${k}` : k;
        if (!(k in a)) {
          html += `<div class="diff-row diff-add"><div class="diff-path">${newPath}</div><div class="diff-val">${JSON.stringify(b[k])}</div></div>`;
        } else if (!(k in b)) {
          html += `<div class="diff-row diff-del"><div class="diff-path">${newPath}</div><div class="diff-val">${JSON.stringify(a[k])}</div></div>`;
        } else if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) {
          html += renderDiff(a[k], b[k], newPath);
        } else {
          html += `<div class="diff-row diff-same"><div class="diff-path">${newPath}</div><div class="diff-val">${JSON.stringify(a[k])}</div></div>`;
        }
      });
    }
    return html;
  }

  // Keyboard shortcuts
  on(document, 'keydown', (e) => {
    // Ctrl/Cmd + Enter to send request
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      sendRequest();
    }
    // Ctrl/Cmd + S to save to collection
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      $('#saveBtn').click();
    }
    // Ctrl/Cmd + K to focus URL bar
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      $('#requestUrl').focus();
      $('#requestUrl').select();
    }
    // Ctrl/Cmd + / to toggle theme
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      $('#themeToggle').click();
    }
    // Ctrl/Cmd + 1-4 to switch sidebar tabs
    if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '4') {
      e.preventDefault();
      const tabs = ['collections', 'history', 'env', 'tools'];
      const idx = parseInt(e.key) - 1;
      if (tabs[idx]) {
        document.querySelector(`[data-tab="${tabs[idx]}"]`)?.click();
      }
    }
  });

  init().catch(err => {
    console.error('Init error:', err);
    toast('Failed to initialize: ' + err.message, 'error');
  });
})();
