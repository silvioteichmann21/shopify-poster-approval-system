export function renderPortalPage(opts: { previewPageBase: string; publicBaseUrl: string }) {
  const previewBase = opts.previewPageBase.replace(/\/$/, '');
  const publicBase = opts.publicBaseUrl.replace(/\/$/, '');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Poster Lead Portal — Social Orbit Studios</title>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0a0a0a;
      --border: rgba(240,237,232,0.1);
      --text: #f0ede8;
      --muted: #888;
      --accent: #c8f54a;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: 'DM Sans', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
    }
    .topbar {
      padding: 18px 22px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .kicker {
      font-family: 'DM Mono', monospace;
      font-size: 11px;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: var(--accent);
      margin: 0 0 4px;
    }
    h1 {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 28px;
      letter-spacing: 1px;
      margin: 0;
      font-weight: 400;
    }
    .layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      min-height: calc(100vh - 72px);
    }
    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
    .list-pane {
      border-right: 1px solid var(--border);
      overflow: auto;
      max-height: calc(100vh - 72px);
      display: flex;
      flex-direction: column;
    }
    .list-search {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      background: var(--bg);
      z-index: 2;
    }
    .list-search input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: rgba(0,0,0,0.35);
      color: var(--text);
      font: inherit;
      font-size: 14px;
    }
    .list-search input::placeholder { color: var(--muted); }
    .list-search input:focus {
      outline: none;
      border-color: rgba(200,245,74,0.45);
    }
    .list-items { flex: 1; overflow: auto; }
    .detail-pane { padding: 22px; overflow: auto; }
    .lead-item {
      display: block;
      width: 100%;
      text-align: left;
      border: 0;
      border-bottom: 1px solid var(--border);
      background: transparent;
      color: inherit;
      padding: 14px 18px;
      cursor: pointer;
      font: inherit;
    }
    .lead-item:hover, .lead-item.active { background: rgba(200,245,74,0.06); }
    .lead-item.active { box-shadow: inset 3px 0 0 var(--accent); }
    .lead-name { font-weight: 600; font-size: 15px; margin-bottom: 4px; }
    .lead-meta { font-size: 12px; color: var(--muted); line-height: 1.45; }
    .badge {
      display: inline-block;
      font-family: 'DM Mono', monospace;
      font-size: 10px;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 999px;
      border: 1px solid var(--border);
      margin-top: 8px;
    }
    .badge--new { color: #ffb347; border-color: rgba(255,179,71,0.35); }
    .badge--preview_ready { color: var(--accent); border-color: rgba(200,245,74,0.35); }
    .badge--sent { color: #8ec8ff; border-color: rgba(142,200,255,0.35); }
    .empty { padding: 28px 18px; color: var(--muted); font-size: 14px; line-height: 1.6; }
    .card {
      border: 1px solid var(--border);
      border-radius: 16px;
      background: linear-gradient(165deg, rgba(24,24,22,0.97) 0%, #0e0e0e 100%);
      padding: 20px;
      margin-bottom: 18px;
    }
    .card h2 {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 24px;
      margin: 0 0 14px;
      font-weight: 400;
    }
    .card--summary {
      display: flex;
      flex-direction: column;
      max-height: 320px;
      overflow: hidden;
    }
    .card--summary h2 {
      flex-shrink: 0;
      margin-bottom: 10px;
    }
    .card--summary .grid {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding-right: 4px;
      align-content: start;
    }
    .card--summary .grid::-webkit-scrollbar { width: 8px; }
    .card--summary .grid::-webkit-scrollbar-track { background: transparent; }
    .card--summary .grid::-webkit-scrollbar-thumb {
      background: rgba(240,237,232,0.18);
      border-radius: 999px;
    }
    .card--summary .grid dd {
      white-space: pre-wrap;
    }
    .card--summary .variant-pill {
      flex-shrink: 0;
      margin-top: 12px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px 18px;
      font-size: 14px;
    }
    .grid dt { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
    .grid dd { margin: 0; word-break: break-word; }
    label {
      display: block;
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    input[type="text"] {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: #0d0d0d;
      color: var(--text);
      padding: 12px 14px;
      font: inherit;
    }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
    button.primary {
      border: 0;
      border-radius: 10px;
      padding: 13px 18px;
      font: inherit;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      cursor: pointer;
      background: linear-gradient(180deg, #ff6b6b 0%, #ff2d2d 45%, #b10000 100%);
      color: #120404;
    }
    button.secondary {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 13px 18px;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      background: #141414;
      color: var(--text);
    }
    .link-box {
      margin-top: 14px;
      padding: 12px 14px;
      border-radius: 10px;
      border: 1px dashed rgba(200,245,74,0.35);
      background: rgba(200,245,74,0.05);
      font-family: 'DM Mono', monospace;
      font-size: 12px;
      line-height: 1.5;
      word-break: break-all;
      display: none;
    }
    .link-box.show { display: block; }
    .workflow-steps {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 16px;
      font-size: 12px;
      color: var(--muted);
      font-family: 'DM Mono', monospace;
    }
    .workflow-steps span {
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: rgba(255,255,255,0.02);
    }
    .workflow-steps span.active {
      color: var(--accent);
      border-color: rgba(200,245,74,0.35);
    }
    .upload-dropzone {
      margin-top: 8px;
      padding: 28px 18px;
      border: 2px dashed rgba(240,237,232,0.18);
      border-radius: 14px;
      text-align: center;
      cursor: pointer;
      background: rgba(255,255,255,0.02);
      transition: border-color 0.2s, background 0.2s;
    }
    .upload-dropzone:hover, .upload-dropzone.dragover {
      border-color: rgba(200,245,74,0.45);
      background: rgba(200,245,74,0.05);
    }
    .upload-dropzone p { margin: 0 0 6px; font-weight: 600; }
    .upload-dropzone small { color: var(--muted); font-size: 12px; }
    .upload-dropzone input[type="file"] { display: none; }
    .upload-status {
      margin-top: 12px;
      font-size: 13px;
      color: var(--muted);
      min-height: 18px;
    }
    .preview-or-divider {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 18px 0;
      color: var(--muted);
      font-family: 'DM Mono', monospace;
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .preview-or-divider::before,
    .preview-or-divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border);
    }
    .preview-url-section { margin-top: 0; }
    .variant-pill {
      display: inline-block;
      margin-top: 10px;
      padding: 6px 10px;
      border-radius: 8px;
      background: rgba(200,245,74,0.08);
      border: 1px solid rgba(200,245,74,0.2);
      font-size: 12px;
      color: var(--accent);
      font-family: 'DM Mono', monospace;
    }
    .placeholder { color: var(--muted); font-size: 15px; line-height: 1.6; padding: 40px 10px; }
    .preview-thumb {
      margin-top: 14px;
      max-width: 280px;
      border-radius: 10px;
      border: 1px solid var(--border);
      display: none;
    }
    .preview-thumb.show { display: block; width: 100%; height: auto; }
    .toast-region {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 20;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .toast {
      padding: 12px 16px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: #141414;
      font-size: 14px;
      opacity: 0;
      transform: translateY(8px);
      transition: opacity 0.25s, transform 0.25s;
    }
    .toast.show { opacity: 1; transform: none; }
    .toast.ok { border-color: rgba(200,245,74,0.4); }
    .toast.new-lead {
      border-color: rgba(255,179,71,0.5);
      background: linear-gradient(145deg, #1a1610 0%, #141414 100%);
      font-weight: 600;
      cursor: pointer;
      max-width: 320px;
    }
    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .live-status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--muted);
      font-family: 'DM Mono', monospace;
      letter-spacing: 0.5px;
    }
    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 10px rgba(200,245,74,0.6);
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.55; transform: scale(0.92); }
    }
    .lead-item.lead-item--fresh {
      animation: freshLead 1.2s ease-out;
      background: rgba(255,179,71,0.08);
    }
    @keyframes freshLead {
      from { background: rgba(255,179,71,0.22); }
      to { background: rgba(255,179,71,0.08); }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div>
      <p class="kicker">Internal · poster leads</p>
      <h1>Lead Portal</h1>
    </div>
    <div class="topbar-actions">
      <div class="live-status" title="Checks for new leads every 20 seconds">
        <span class="live-dot" aria-hidden="true"></span>
        <span>Live</span>
      </div>
      <button type="button" class="secondary" id="notifyBtn" hidden>Enable alerts</button>
      <button type="button" class="secondary" id="refreshBtn">Refresh</button>
    </div>
  </header>
  <div class="layout">
    <aside class="list-pane">
      <div class="list-search">
        <input type="search" id="leadSearch" placeholder="Search by name…" autocomplete="off" spellcheck="false" />
      </div>
      <div class="list-items" id="leadList"><div class="empty">Loading leads…</div></div>
    </aside>
    <main class="detail-pane" id="leadDetail">
      <div class="placeholder">Select a lead to upload a preview and copy the customer link.</div>
    </main>
  </div>
  <div class="toast-region" id="toastRegion"></div>
<script>
  const PREVIEW_PAGE_BASE = ${JSON.stringify(previewBase)};
  const PUBLIC_BASE_URL = ${JSON.stringify(publicBase)};
  const POLL_INTERVAL_MS = 20000;
  let leads = [];
  let activeId = null;
  let knownLeadIds = null;
  let freshLeadIds = new Set();
  let pollTimer = null;
  let titleFlashTimer = null;
  let uploadEnabled = false;
  let searchQuery = '';
  const defaultTitle = document.title;

  function toast(msg, ok, opts) {
    opts = opts || {};
    const el = document.createElement('div');
    el.className = 'toast ' + (opts.newLead ? 'new-lead' : ok ? 'ok' : '');
    el.textContent = msg;
    if (opts.onClick) {
      el.addEventListener('click', opts.onClick);
    }
    document.getElementById('toastRegion').appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.remove(); }, 300);
    }, opts.newLead ? 8000 : 3200);
  }

  function flashTitle(message) {
    clearInterval(titleFlashTimer);
    let on = true;
    titleFlashTimer = setInterval(function () {
      document.title = on ? message : defaultTitle;
      on = !on;
    }, 900);
    setTimeout(function () {
      clearInterval(titleFlashTimer);
      document.title = defaultTitle;
    }, 12000);
  }

  function updateNotifyButton() {
    const btn = document.getElementById('notifyBtn');
    if (!btn || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      btn.hidden = true;
      return;
    }
    btn.hidden = false;
    btn.textContent = Notification.permission === 'denied' ? 'Alerts blocked' : 'Enable alerts';
    btn.disabled = Notification.permission === 'denied';
  }

  async function requestNotifications() {
    if (!('Notification' in window)) {
      toast('Browser alerts are not supported here', false);
      return;
    }
    if (Notification.permission === 'granted') {
      updateNotifyButton();
      return;
    }
    if (Notification.permission === 'denied') {
      toast('Alerts blocked — allow notifications in browser settings', false);
      return;
    }
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      toast('Alerts enabled — you will be notified for new leads', true);
    }
    updateNotifyButton();
  }

  function notifyNewLead(lead) {
    const name = lead.first_name || 'New lead';
    const vehicle = lead.vehicle || 'Vehicle details pending';
    const summary = name + ' — ' + vehicle;

    freshLeadIds.add(lead.id);
    toast('New lead: ' + summary, true, {
      newLead: true,
      onClick: function () { openLead(lead.id); },
    });
    flashTitle('New lead — ' + name);

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification('New poster lead', {
          body: summary,
          tag: 'lead-' + lead.id,
        });
        n.onclick = function () {
          window.focus();
          openLead(lead.id);
          n.close();
        };
      } catch (e) {}
    }
  }

  async function api(path, opts) {
    const res = await fetch(path, Object.assign({
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
    }, opts || {}));
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch (e) {}
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || ('HTTP ' + res.status));
    }
    return data;
  }

  function badgeClass(status) {
    if (status === 'sent') return 'badge--sent';
    if (status === 'preview_ready') return 'badge--preview_ready';
    return 'badge--new';
  }

  function escHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }

  function leadsMatchingSearch(list) {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(function (lead) {
      return String(lead.first_name || '').toLowerCase().indexOf(q) !== -1;
    });
  }

  function renderList() {
    const root = document.getElementById('leadList');
    if (!leads.length) {
      root.innerHTML = '<div class="empty">No leads yet. New submissions from your site will appear here.</div>';
      return;
    }
    const visible = leadsMatchingSearch(leads);
    if (!visible.length) {
      root.innerHTML = '<div class="empty">No leads matching “' + escHtml(searchQuery.trim()) + '”.</div>';
      return;
    }
    root.innerHTML = visible.map(function (lead) {
      const active = lead.id === activeId ? ' active' : '';
      const fresh = freshLeadIds.has(lead.id) ? ' lead-item--fresh' : '';
      return '<button type="button" class="lead-item' + active + fresh + '" data-id="' + lead.id + '">' +
        '<div class="lead-name">' + escHtml(lead.first_name || 'Unknown') + '</div>' +
        '<div class="lead-meta">' + escHtml(lead.vehicle || 'Vehicle TBD') + '</div>' +
        '<div class="lead-meta">' + escHtml([lead.finish, lead.size, lead.design].filter(Boolean).join(' · ')) + '</div>' +
        '<span class="badge ' + badgeClass(lead.status) + '">' + escHtml(lead.status || 'new') + '</span>' +
      '</button>';
    }).join('');
    root.querySelectorAll('.lead-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openLead(btn.getAttribute('data-id'));
      });
    });
  }

  function isBadImageUrl(url) {
    const u = String(url || '');
    return u.indexOf('/pages/poster-preview') !== -1 || u.indexOf('poster-preview?token=') !== -1;
  }

  function imageUrlForLead(lead) {
    const url = String(lead.preview_image_url || '').trim();
    if (!url || isBadImageUrl(url)) return '';
    return url;
  }

  function customerLinkForLead(lead) {
    const imageUrl = imageUrlForLead(lead);
    const variantId = String(lead.variant_id || '').trim();
    if (imageUrl && variantId && /^[0-9]+$/.test(variantId)) {
      return PREVIEW_PAGE_BASE + '?img=' + encodeURIComponent(imageUrl) + '&variant=' + encodeURIComponent(variantId);
    }
    return lead.customer_preview_url || '';
  }

  function renderDetail(lead) {
    const root = document.getElementById('leadDetail');
    const customerLink = customerLinkForLead(lead);
    const imageUrl = imageUrlForLead(lead);
    const hasPreview = Boolean(imageUrl);
    const step2Active = hasPreview ? ' active' : '';
    const urlPasteSection =
      '<label for="previewUrl">' + (uploadEnabled ? 'Or paste image URL' : 'Preview image URL (from Shopify Files)') + '</label>' +
      '<input type="text" id="previewUrl" placeholder="https://cdn.shopify.com/s/files/1/.../poster.png" value="' + escHtml(imageUrl) + '" />' +
      '<div class="actions"><button type="button" class="' + (uploadEnabled ? 'secondary' : 'primary') + '" id="savePreviewBtn">Save preview image</button></div>';
    const uploadSection = uploadEnabled
      ? '<label>Upload finished Canva preview</label>' +
        '<div class="upload-dropzone" id="uploadDropzone">' +
          '<p>Drop image here or click to choose</p>' +
          '<small>PNG, JPG, or WEBP · max 15 MB</small>' +
          '<input type="file" id="previewFile" accept="image/png,image/jpeg,image/webp,image/gif" />' +
        '</div>' +
        '<div class="upload-status" id="uploadStatus"></div>' +
        '<div class="preview-or-divider"><span>or</span></div>' +
        '<div class="preview-url-section">' + urlPasteSection + '</div>'
      : urlPasteSection;
    root.innerHTML =
      '<div class="card card--summary">' +
        '<h2>' + escHtml(lead.first_name) + '</h2>' +
        '<div class="grid">' +
          detailField('Phone', lead.phone_number) +
          detailField('Vehicle', lead.vehicle) +
          detailField('Style', lead.design) +
          detailField('Size', lead.size) +
          detailField('Finish', lead.finish) +
          detailField('Color', lead.color) +
          detailField('Price', lead.price_display) +
          detailField('Notes', lead.special_notes) +
        '</div>' +
        '<div class="variant-pill">Checkout variant mapped automatically — no Shopify admin needed</div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="workflow-steps">' +
          '<span class="active">1 · Open lead</span>' +
          '<span class="active">2 · Add preview</span>' +
          '<span' + step2Active + '>3 · Copy link &amp; send</span>' +
        '</div>' +
        uploadSection +
        '<img id="previewThumb" class="preview-thumb' + (hasPreview ? ' show' : '') + '" alt="Preview" src="' + escHtml(imageUrl) + '" />' +
        '<label style="margin-top:18px;">Customer preview link</label>' +
        '<div class="link-box show" id="linkBox">' + escHtml(customerLink) + '</div>' +
        '<div class="actions">' +
          '<button type="button" class="primary" id="copyLinkBtn">Copy link &amp; send to customer</button>' +
          (lead.status !== 'sent'
            ? '<button type="button" class="secondary" id="markSentBtn">Mark as sent</button>'
            : '') +
        '</div>' +
        '<p style="margin:14px 0 0;color:#888;font-size:13px;line-height:1.5;">After saving the preview image, copy this link and send it. The customer opens it on your store and sees their poster with the correct size and finish.</p>' +
      '</div>';

    const thumb = document.getElementById('previewThumb');

    if (uploadEnabled) {
      const dropzone = document.getElementById('uploadDropzone');
      const fileInput = document.getElementById('previewFile');
      const uploadStatus = document.getElementById('uploadStatus');

      function setUploadStatus(msg) {
        if (uploadStatus) uploadStatus.textContent = msg || '';
      }

      async function handleFile(file) {
        if (!file) return;
        setUploadStatus('Uploading…');
        const fd = new FormData();
        fd.append('file', file);
        try {
          const res = await fetch('/portal/api/leads/' + encodeURIComponent(lead.id) + '/upload', {
            method: 'POST',
            credentials: 'include',
            body: fd,
          });
          const text = await res.text();
          let data = {};
          try { data = text ? JSON.parse(text) : {}; } catch (e) {}
          if (!res.ok || data.ok === false) {
            throw new Error(data.error || ('HTTP ' + res.status));
          }
          setUploadStatus('Preview uploaded successfully.');
          if (data.preview_image_url) {
            thumb.src = data.preview_image_url;
            thumb.classList.add('show');
          }
          toast('Preview uploaded — copy the customer link below', true);
          await loadLeads();
          openLead(lead.id);
        } catch (e) {
          setUploadStatus('');
          toast(e.message || 'Upload failed', false);
        }
      }

      dropzone.addEventListener('click', function () { fileInput.click(); });
      fileInput.addEventListener('change', function () {
        if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
      });
      dropzone.addEventListener('dragover', function (e) {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
      dropzone.addEventListener('dragleave', function () {
        dropzone.classList.remove('dragover');
      });
      dropzone.addEventListener('drop', function (e) {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) handleFile(file);
      });
    }

    const urlInput = document.getElementById('previewUrl');
    if (urlInput) {
      urlInput.addEventListener('input', function () {
        const v = urlInput.value.trim();
        if (v && !isBadImageUrl(v)) {
          thumb.src = v;
          thumb.classList.add('show');
        } else if (!v) {
          thumb.classList.remove('show');
        }
      });
      document.getElementById('savePreviewBtn').addEventListener('click', async function () {
        const preview_image_url = urlInput.value.trim();
        if (!preview_image_url) {
          toast('Paste the image link first', false);
          return;
        }
        if (isBadImageUrl(preview_image_url)) {
          toast('Paste the cdn.shopify.com image URL, not the customer link', false);
          return;
        }
        try {
          await api('/portal/api/leads/' + encodeURIComponent(lead.id) + '/preview', {
            method: 'POST',
            body: JSON.stringify({ preview_image_url: preview_image_url }),
          });
          toast('Preview image saved', true);
          await loadLeads();
          openLead(lead.id);
        } catch (e) {
          toast(e.message || 'Save failed', false);
        }
      });
    }

    document.getElementById('copyLinkBtn').addEventListener('click', async function () {
      const url = document.getElementById('linkBox').textContent.trim();
      await copyText(url);
      toast('Customer link copied — paste into SMS or email', true);
    });

    const markSentBtn = document.getElementById('markSentBtn');
    if (markSentBtn) {
      markSentBtn.addEventListener('click', async function () {
        try {
          await api('/portal/api/leads/' + encodeURIComponent(lead.id) + '/sent', { method: 'POST', body: '{}' });
          toast('Marked as sent', true);
          await loadLeads();
          openLead(lead.id);
        } catch (e) {
          toast(e.message || 'Could not update status', false);
        }
      });
    }
  }

  function detailField(label, value) {
    if (!value) return '';
    return '<div><dt>' + escHtml(label) + '</dt><dd>' + escHtml(value) + '</dd></div>';
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) { window.prompt('Copy this link:', text); }
  }

  async function openLead(id) {
    activeId = id;
    freshLeadIds.delete(id);
    renderList();
    try {
      const data = await api('/portal/api/leads/' + encodeURIComponent(id));
      renderDetail(data.lead);
    } catch (e) {
      document.getElementById('leadDetail').innerHTML = '<div class="placeholder">' + escHtml(e.message || 'Could not load lead') + '</div>';
    }
  }

  async function loadLeads() {
    const data = await api('/portal/api/leads');
    leads = data.leads || [];
    renderList();
    return leads;
  }

  async function pollForNewLeads() {
    try {
      const data = await api('/portal/api/leads');
      const incoming = data.leads || [];

      if (knownLeadIds === null) {
        knownLeadIds = new Set(incoming.map(function (lead) { return lead.id; }));
        leads = incoming;
        renderList();
        return;
      }

      const newLeads = incoming.filter(function (lead) {
        return !knownLeadIds.has(lead.id);
      });
      if (newLeads.length) {
        newLeads.forEach(notifyNewLead);
      }

      knownLeadIds = new Set(incoming.map(function (lead) { return lead.id; }));
      leads = incoming;
      renderList();
    } catch (e) {
      // Ignore transient poll errors.
    }
  }

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(pollForNewLeads, POLL_INTERVAL_MS);
  }

  document.getElementById('refreshBtn').addEventListener('click', async function () {
    try {
      const incoming = await loadLeads();
      knownLeadIds = new Set(incoming.map(function (lead) { return lead.id; }));
      if (activeId) await openLead(activeId);
      toast('Refreshed', true);
    } catch (e) {
      toast(e.message || 'Refresh failed', false);
    }
  });

  document.getElementById('notifyBtn').addEventListener('click', requestNotifications);

  document.getElementById('leadSearch').addEventListener('input', function (e) {
    searchQuery = e.target.value || '';
    renderList();
  });

  loadLeads()
    .then(function () {
      return api('/portal/api/config').catch(function () {
        return { upload_enabled: false };
      });
    })
    .then(function (config) {
      uploadEnabled = config.upload_enabled === true;
      knownLeadIds = new Set(leads.map(function (lead) { return lead.id; }));
      startPolling();
      updateNotifyButton();
      if (activeId) return openLead(activeId);
      if ('Notification' in window && Notification.permission === 'default') {
        setTimeout(requestNotifications, 1200);
      }
    }).catch(function (e) {
    document.getElementById('leadList').innerHTML = '<div class="empty">' + escHtml(e.message || 'Could not load leads') + '</div>';
  });
</script>
</body>
</html>`;
}
