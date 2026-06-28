import type { ApprovalRow } from './types';

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export function renderPreviewErrorPage(title: string, message: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)} — Social Orbit Studios</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 48px 24px; background: #050505; color: #f0ede8; line-height: 1.6; }
    .wrap { max-width: 520px; margin: 0 auto; text-align: center; }
    h1 { font-size: 1.5rem; margin: 0 0 12px; }
    p { color: rgba(240,237,232,0.75); margin: 0; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>${esc(title)}</h1>
    <p>${esc(message)}</p>
  </div>
</body>
</html>`;
}

export function renderHomePage(opts: { baseUrl: string }) {
  const b = esc(opts.baseUrl.replace(/\/$/, ''));
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Poster approval — Social Orbit Studios</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 40px 24px; background: #0a0a0a; color: #f0ede8; line-height: 1.5; }
    .wrap { max-width: 520px; margin: 0 auto; }
    h1 { font-size: 1.35rem; margin: 0 0 8px; }
    p { color: #999; font-size: 14px; margin: 0 0 20px; }
    a { color: #c8f54a; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
    ul { padding-left: 1.2rem; color: #aaa; font-size: 14px; }
    li { margin: 8px 0; }
    code { background: #1a1a1a; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Custom Poster System</h1>
    <p>Backend for poster previews, customer approval, and payment capture. If you opened this from Shopify Admin, use the links below.</p>
    <ul>
      <li><a href="${b}/portal">Lead Portal</a> — reservation leads → preview links for customers</li>
      <li><a href="${b}/admin">Poster Approval Admin</a> — create preview links for orders</li>
      <li><code>/approve/&lt;token&gt;</code> — customer review page (use link from admin)</li>
      <li><a href="${b}/auth/install?shop=YOURSHOP.myshopify.com">OAuth install</a> — replace YOURSHOP if reinstalling</li>
    </ul>
  </div>
</body>
</html>`;
}

export function renderApprovePage(token: string) {
  // This page pulls approval data from /api/approval/:token and renders your branded UI.
  // The visual styling is intentionally based on the supplied poster-approval.html.
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Your Poster Preview — Social Orbit Studios</title>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --black: #0a0a0a;
    --off-white: #f0ede8;
    --cream: #e8e3db;
    --accent: #c8f54a;
    --accent-dark: #a8d830;
    --red: #ff3b30;
    --mid: #1e1e1e;
    --border: rgba(240,237,232,0.12);
    --text-muted: #666;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: var(--black); color: var(--off-white); font-family: 'DM Sans', sans-serif; min-height: 100vh; overflow-x: hidden; }
  header { display:flex; justify-content:space-between; align-items:center; padding:24px 48px; border-bottom:1px solid var(--border); position:sticky; top:0; background:rgba(10,10,10,0.92); backdrop-filter:blur(12px); z-index:100; }
  .logo { font-family:'Bebas Neue', sans-serif; font-size:22px; letter-spacing:3px; color:var(--off-white); }
  .order-badge { font-family:'DM Mono', monospace; font-size:11px; color:var(--text-muted); letter-spacing:1px; }
  .hero { padding:64px 48px 40px; max-width:1100px; margin:0 auto; }
  .step-label { font-family:'DM Mono', monospace; font-size:11px; letter-spacing:3px; color:var(--accent); text-transform:uppercase; margin-bottom:16px; }
  h1 { font-family:'Bebas Neue', sans-serif; font-size:clamp(52px, 8vw, 88px); line-height:0.95; letter-spacing:2px; color:var(--off-white); margin-bottom:20px; }
  h1 span { color:var(--accent); }
  .subtitle { font-size:15px; color:var(--text-muted); max-width:480px; line-height:1.6; }
  .main { max-width:1100px; margin:0 auto; padding:0 48px 80px; display:grid; grid-template-columns:1fr 420px; gap:48px; align-items:start; }
  .poster-panel { position:sticky; top:100px; }
  .poster-frame { background:var(--mid); border:1px solid var(--border); border-radius:4px; overflow:hidden; position:relative; }
  .poster-frame img { width:100%; display:block; aspect-ratio:2/3; object-fit:cover; }
  .poster-placeholder { width:100%; aspect-ratio:2/3; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; background:var(--mid); color:var(--text-muted); }
  .poster-placeholder svg { opacity:0.3; }
  .poster-placeholder p { font-family:'DM Mono', monospace; font-size:11px; letter-spacing:2px; opacity:0.5; }
  .poster-tag { position:absolute; top:16px; left:16px; background:var(--accent); color:var(--black); font-family:'DM Mono', monospace; font-size:10px; font-weight:500; letter-spacing:2px; padding:4px 10px; text-transform:uppercase; }
  .poster-meta { padding:20px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; }
  .car-name { font-family:'Bebas Neue', sans-serif; font-size:20px; letter-spacing:1px; }
  .order-num { font-family:'DM Mono', monospace; font-size:11px; color:var(--text-muted); }
  .action-panel { display:flex; flex-direction:column; gap:16px; padding-top:8px; }
  .section-title { font-family:'Bebas Neue', sans-serif; font-size:28px; letter-spacing:1px; margin-bottom:4px; }
  .section-sub { font-size:13px; color:var(--text-muted); line-height:1.5; margin-bottom:8px; }
  .btn { width:100%; padding:20px 24px; border:none; cursor:pointer; font-family:'Bebas Neue', sans-serif; font-size:22px; letter-spacing:2px; transition:all 0.15s ease; display:flex; align-items:center; justify-content:space-between; border-radius:2px; position:relative; overflow:hidden; }
  .btn[disabled] { opacity:0.55; cursor:not-allowed; transform:none !important; }
  .btn-approve { background:var(--accent); color:var(--black); }
  .btn-approve:hover { background:var(--accent-dark); transform:translateY(-1px); }
  .btn-approve:active { transform:translateY(0); }
  .btn-edit { background:transparent; color:var(--off-white); border:1px solid var(--border); }
  .btn-edit:hover { border-color:var(--off-white); background:rgba(240,237,232,0.04); }
  .btn-decline { background:transparent; color:var(--red); border:1px solid rgba(255,59,48,0.25); }
  .btn-decline:hover { border-color:var(--red); background:rgba(255,59,48,0.06); }
  .btn-icon { font-size:18px; opacity:0.7; }
  .edit-box { display:none; flex-direction:column; gap:12px; background:var(--mid); border:1px solid var(--border); border-radius:2px; padding:20px; animation:slideDown 0.2s ease; }
  .edit-box.open { display:flex; }
  @keyframes slideDown { from { opacity:0; transform:translateY(-8px);} to { opacity:1; transform:translateY(0);} }
  .edit-label { font-family:'DM Mono', monospace; font-size:10px; letter-spacing:2px; color:var(--accent); text-transform:uppercase; }
  textarea { background:var(--black); border:1px solid var(--border); border-radius:2px; color:var(--off-white); font-family:'DM Sans', sans-serif; font-size:14px; line-height:1.6; padding:14px; resize:vertical; min-height:120px; transition:border-color 0.15s; width:100%; }
  textarea:focus { outline:none; border-color:var(--accent); }
  textarea::placeholder { color:#444; }
  .btn-submit-edit { background:var(--off-white); color:var(--black); border:none; padding:14px 20px; font-family:'Bebas Neue', sans-serif; font-size:18px; letter-spacing:2px; cursor:pointer; border-radius:2px; transition:all 0.15s; display:flex; align-items:center; justify-content:space-between; }
  .btn-submit-edit:hover { background:var(--cream); }
  .divider { display:flex; align-items:center; gap:12px; color:#333; font-family:'DM Mono', monospace; font-size:10px; letter-spacing:2px; }
  .divider::before, .divider::after { content:''; flex:1; height:1px; background:var(--border); }
  .guarantee { margin-top:8px; padding:16px; border:1px solid var(--border); border-radius:2px; display:flex; gap:12px; align-items:flex-start; }
  .guarantee-icon { font-size:20px; flex-shrink:0; margin-top:2px; }
  .guarantee-text { font-size:12px; color:var(--text-muted); line-height:1.6; }
  .guarantee-text strong { display:block; color:var(--off-white); font-size:13px; margin-bottom:2px; }
  .confirm-overlay { display:none; position:fixed; inset:0; background:rgba(10,10,10,0.95); z-index:200; align-items:center; justify-content:center; flex-direction:column; gap:24px; text-align:center; padding:48px; }
  .confirm-overlay.active { display:flex; }
  .confirm-icon { font-size:64px; animation:popIn 0.3s ease; }
  @keyframes popIn { from { transform:scale(0.5); opacity:0; } to { transform:scale(1); opacity:1; } }
  .confirm-title { font-family:'Bebas Neue', sans-serif; font-size:52px; letter-spacing:2px; }
  .confirm-sub { font-size:15px; color:var(--text-muted); max-width:360px; line-height:1.6; }
  .error { margin-top:12px; font-size:13px; color:var(--red); }
  @media (max-width: 768px) {
    header { padding:20px 24px; }
    .hero { padding:40px 24px 24px; }
    .main { padding:0 24px 60px; grid-template-columns:1fr; }
    .poster-panel { position:static; }
    h1 { font-size:52px; }
  }
  body::before {
    content:'';
    position:fixed;
    inset:0;
    background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
    pointer-events:none;
    z-index:0;
    opacity:0.4;
  }
  * { position:relative; z-index:1; }
</style>
</head>
<body>
<header>
  <div class="logo">Social Orbit Studios</div>
  <div class="order-badge" id="orderBadge">PREVIEW</div>
</header>
<div class="hero">
  <div class="step-label">Step 2 of 3 — Review Your Poster</div>
  <h1>Your poster<br>is <span>ready.</span></h1>
  <p class="subtitle">Take your time. Your card hasn't been charged. Approve it, request changes, or walk away — no pressure.</p>
  <p class="error" id="topError" style="display:none;"></p>
</div>
<div class="main">
  <div class="poster-panel">
    <div class="poster-frame">
      <div class="poster-placeholder" id="placeholder">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <path d="M21 15l-5-5L5 21"/>
        </svg>
        <p>POSTER IMAGE</p>
      </div>
      <img id="posterImg" alt="Poster preview" style="display:none;" />
      <div class="poster-tag">Preview</div>
      <div class="poster-meta">
        <div class="car-name" id="posterTitle">Custom Poster</div>
        <div class="order-num" id="orderNum">—</div>
      </div>
    </div>
  </div>
  <div class="action-panel">
    <div>
      <div class="section-title">What do you think?</div>
      <p class="section-sub">This is exactly what you'll receive. High-res print file shipped to your door.</p>
    </div>
    <button class="btn btn-approve" id="approveBtn">
      <span>Approve & Charge Card</span><span class="btn-icon">→</span>
    </button>
    <div class="divider">or</div>
    <button class="btn btn-edit" id="editBtn">
      <span>Request Changes</span><span class="btn-icon">✏</span>
    </button>
    <div class="edit-box" id="editBox">
      <div class="edit-label">What would you like changed?</div>
      <textarea id="editNote" placeholder="e.g. Can you flip the car to face the other direction? Also make the background darker..."></textarea>
      <button class="btn-submit-edit" id="submitEditBtn">
        <span>Send My Revision Request</span><span>→</span>
      </button>
    </div>
    <div class="divider">or</div>
    <button class="btn btn-decline" id="declineBtn">
      <span>Decline & Release Hold</span><span class="btn-icon">✕</span>
    </button>
    <div class="guarantee">
      <div class="guarantee-icon">�</div>
      <div class="guarantee-text">
        <strong>Your card is safe</strong>
        You were never charged. Declining releases the authorization — nothing posts to your account.
      </div>
    </div>
  </div>
</div>
<div class="confirm-overlay" id="approveOverlay">
  <div class="confirm-icon">✅</div>
  <div class="confirm-title" style="color: var(--accent)">You're locked in.</div>
  <div class="confirm-sub">Payment captured. Your poster is heading to print. Tracking info coming soon.</div>
</div>
<div class="confirm-overlay" id="editOverlay">
  <div class="confirm-icon">✏️</div>
  <div class="confirm-title">Got it.</div>
  <div class="confirm-sub">Your revision notes are in. We'll send a new preview within 24–48 hours. No charge until you approve.</div>
</div>
<div class="confirm-overlay" id="declineOverlay">
  <div class="confirm-icon">�</div>
  <div class="confirm-title" style="color: var(--text-muted)">No worries.</div>
  <div class="confirm-sub">The hold has been released. Nothing was charged. You're free — come back whenever you're ready.</div>
</div>
<script>
  const TOKEN = ${JSON.stringify(token)};

  function toggleEdit() {
    const box = document.getElementById('editBox');
    const btn = document.getElementById('editBtn');
    const isOpen = box.classList.contains('open');
    if (isOpen) {
      box.classList.remove('open');
      btn.querySelector('span').textContent = 'Request Changes';
    } else {
      box.classList.add('open');
      btn.querySelector('span').textContent = 'Cancel';
      document.getElementById('editNote').focus();
    }
  }

  function setTopError(msg) {
    const el = document.getElementById('topError');
    if (!el) return;
    el.style.display = msg ? 'block' : 'none';
    el.textContent = msg || '';
  }

  function setDisabled(disabled) {
    for (const id of ['approveBtn', 'editBtn', 'declineBtn', 'submitEditBtn']) {
      const el = document.getElementById(id);
      if (el) el.disabled = !!disabled;
    }
  }

  async function api(path, body) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) throw new Error(data.error || 'Request failed');
    return data;
  }

  async function load() {
    setTopError('');
    const res = await fetch('/api/approval/' + encodeURIComponent(TOKEN), { method: 'GET' });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setTopError((data && data.error) ? data.error : 'This preview link is invalid or expired.');
      setDisabled(true);
      return;
    }
    const a = data.approval;
    document.getElementById('orderNum').textContent = a.order_name || ('#' + a.order_id);
    document.getElementById('orderBadge').textContent = (a.order_name || ('#' + a.order_id)) + ' · PREVIEW READY';
    document.getElementById('posterTitle').textContent = a.poster_title || 'Custom Poster';
    if (a.preview_image_url) {
      const img = document.getElementById('posterImg');
      const ph = document.getElementById('placeholder');
      img.src = a.preview_image_url;
      img.style.display = 'block';
      ph.style.display = 'none';
    }
    if (a.status === 'approved' || a.status === 'declined') {
      setDisabled(true);
    }
  }

  async function handleApprove() {
    try {
      setDisabled(true);
      setTopError('');
      await api('/api/approval/' + encodeURIComponent(TOKEN) + '/approve', {});
      document.getElementById('approveOverlay').classList.add('active');
    } catch (e) {
      setTopError(e.message || 'Could not approve.');
      setDisabled(false);
    }
  }

  async function handleEdit() {
    const noteEl = document.getElementById('editNote');
    const note = (noteEl.value || '').trim();
    if (!note) {
      noteEl.style.borderColor = 'var(--red)';
      noteEl.placeholder = 'Please describe what you want changed...';
      return;
    }
    try {
      setDisabled(true);
      setTopError('');
      await api('/api/approval/' + encodeURIComponent(TOKEN) + '/edits', { note });
      document.getElementById('editOverlay').classList.add('active');
    } catch (e) {
      setTopError(e.message || 'Could not send edits.');
      setDisabled(false);
    }
  }

  async function handleDecline() {
    try {
      setDisabled(true);
      setTopError('');
      await api('/api/approval/' + encodeURIComponent(TOKEN) + '/decline', {});
      document.getElementById('declineOverlay').classList.add('active');
    } catch (e) {
      setTopError(e.message || 'Could not decline.');
      setDisabled(false);
    }
  }

  document.getElementById('editBtn').addEventListener('click', toggleEdit);
  document.getElementById('approveBtn').addEventListener('click', handleApprove);
  document.getElementById('submitEditBtn').addEventListener('click', handleEdit);
  document.getElementById('declineBtn').addEventListener('click', handleDecline);
  load();
</script>
</body>
</html>`;
}

export function renderAdminPage(_opts: { notifyEmail?: string }) {
  void _opts;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Poster Approval Admin — Social Orbit Studios</title>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --black: #050505;
      --off: #f0ede8;
      --muted: #9c9890;
      --mid: #141414;
      --card: #0e0e0e;
      --border: rgba(240,237,232,0.08);
      --accent: #c8f54a;
      --accent-dim: #b0e038;
      --accent-glow: rgba(200,245,74,0.45);
      --terminal-fg: #b8c4a8;
      --terminal-dim: #5a6652;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: var(--black);
      color: var(--off);
      font-family: 'DM Sans', system-ui, sans-serif;
      font-size: 15px;
      line-height: 1.5;
    }
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
      pointer-events: none;
      z-index: 0;
    }
    body::after {
      content: '';
      position: fixed;
      inset: 0;
      background-image:
        linear-gradient(rgba(200,245,74,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(200,245,74,0.03) 1px, transparent 1px);
      background-size: 48px 48px;
      mask-image: radial-gradient(ellipse 80% 60% at 50% 20%, black 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
    }
    .shell { position: relative; z-index: 1; max-width: 920px; margin: 0 auto; padding: 32px 22px 56px; }
    .panel {
      position: relative;
      margin-top: 5vh;
      background: linear-gradient(165deg, rgba(24,24,22,0.97) 0%, var(--card) 42%, #0a0a0a 100%);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 0;
      box-shadow:
        0 0 0 1px rgba(200,245,74,0.06),
        0 32px 64px rgba(0,0,0,0.65),
        inset 0 1px 0 rgba(255,255,255,0.05);
      overflow: hidden;
    }
    .panel-topshine {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, transparent, var(--accent), var(--accent-dim), transparent);
      background-size: 200% 100%;
      animation: shine 8s linear infinite;
      opacity: 0.85;
    }
    @keyframes shine {
      0% { background-position: 0% 50%; }
      100% { background-position: 200% 50%; }
    }
    @media (prefers-reduced-motion: reduce) {
      .panel-topshine { animation: none; background: linear-gradient(90deg, var(--accent-dim), var(--accent), var(--accent-dim)); }
    }
    .panel-inner { padding: 32px 28px 28px; position: relative; }
    @media (min-width: 640px) { .panel-inner { padding: 36px 36px 32px; } }
    .panel-head {
      margin-bottom: 28px;
      padding-bottom: 22px;
      border-bottom: 1px solid var(--border);
    }
    .panel-kicker {
      font-family: 'DM Mono', monospace;
      font-size: 18px;
      letter-spacing: 4px;
      color: var(--accent);
      text-transform: uppercase;
      margin: 0 0 10px;
    }
    .panel-title {
      font-family: 'Bebas Neue', sans-serif;
      font-size: clamp(36px, 9vw, 52px);
      letter-spacing: 3px;
      line-height: 0.95;
      margin: 0 0 10px;
      font-weight: 400;
      color: var(--off);
    }
    .field { margin-bottom: 22px; }
    .field:last-of-type { margin-bottom: 0; }
    .field-inner {
      border-radius: 12px;
      padding: 2px;
      background: linear-gradient(135deg, rgba(255,255,255,0.06), transparent 40%);
      transition: box-shadow 0.2s, background 0.2s;
    }
    .field:focus-within .field-inner {
      box-shadow: 0 0 0 1px rgba(200,245,74,0.25), 0 0 24px rgba(200,245,74,0.08);
      background: linear-gradient(135deg, rgba(200,245,74,0.12), transparent 50%);
    }
    label {
      display: block;
      font-family: 'DM Mono', monospace;
      font-size: 10px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 10px;
    }
    label span { color: #faf8f4; font-weight: 600; letter-spacing: 1px; }
    input {
      width: 100%;
      padding: 15px 16px;
      border-radius: 10px;
      border: 1px solid rgba(240,237,232,0.16);
      background: rgba(22,22,24,0.95);
      color: #faf8f4;
      font-family: 'DM Mono', monospace;
      font-size: 13px;
      letter-spacing: 0.02em;
      transition: border-color 0.15s, background 0.15s;
    }
    input::placeholder { color: #8a8680; }
    input:hover { border-color: rgba(240,237,232,0.16); background: rgba(0,0,0,0.65); }
    .field:focus-within input {
      outline: none;
      border-color: rgba(200,245,74,0.4);
      background: rgba(0,0,0,0.75);
    }
    .actions {
      margin-top: 32px;
      padding-top: 28px;
      border-top: 1px solid var(--border);
    }
    #createBtn {
      width: 100%;
      min-height: 56px;
      padding: 18px 24px;
      border: none;
      border-radius: 12px;
      background: linear-gradient(180deg, #ff6b6b 0%, #ff2d2d 45%, #b10000 100%);
      color: #120404;
      font-family: 'Bebas Neue', sans-serif;
      font-size: clamp(18px, 3.5vw, 22px);
      letter-spacing: 3px;
      cursor: pointer;
      transition: transform 0.15s, filter 0.15s, box-shadow 0.15s;
      box-shadow:
        0 0 44px rgba(255,45,45,0.55),
        0 10px 34px rgba(255,45,45,0.18),
        inset 0 1px 0 rgba(255,255,255,0.38);
      text-shadow: 0 0 18px rgba(255,255,255,0.22);
    }
    #createBtn:hover {
      transform: translateY(-2px);
      filter: brightness(1.05);
      box-shadow:
        0 0 58px rgba(255,45,45,0.6),
        0 16px 46px rgba(255,45,45,0.22),
        inset 0 1px 0 rgba(255,255,255,0.42);
    }
    #createBtn:active { transform: translateY(0); filter: brightness(0.98); }
    .out-wrap {
      margin-top: 28px;
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid var(--border);
      box-shadow: 0 24px 56px rgba(0,0,0,0.55), 0 0 0 1px rgba(200,245,74,0.05);
    }
    .out-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      background: linear-gradient(180deg, #121a14 0%, #0c100c 100%);
      border-bottom: 1px solid rgba(200,245,74,0.12);
      font-family: 'DM Mono', monospace;
      font-size: 10px;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: var(--accent);
    }
    .out-dots { display: flex; gap: 7px; }
    .out-dots span {
      width: 11px;
      height: 11px;
      border-radius: 50%;
      box-shadow: inset 0 -2px 4px rgba(0,0,0,0.35);
    }
    .out-dots span:first-child { background: #ff5f57; }
    .out-dots span:nth-child(2) { background: #febc2e; }
    .out-dots span:nth-child(3) { background: #28c840; }
    #out {
      font-family: 'DM Mono', monospace;
      font-size: 12px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
      background: #040604;
      color: var(--terminal-fg);
      margin: 0;
      padding: 22px 24px 28px;
      min-height: 140px;
      max-height: 440px;
      overflow-y: auto;
      border-top: 1px solid rgba(200,245,74,0.06);
    }
    #out::selection { background: rgba(200,245,74,0.35); color: var(--black); }
    .toast-region {
      position: fixed;
      bottom: 22px;
      right: 22px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: flex-end;
      max-width: min(400px, calc(100vw - 28px));
      pointer-events: none;
    }
    @media (max-width: 520px) {
      .toast-region { left: 14px; right: 14px; align-items: stretch; max-width: none; }
    }
    .toast {
      pointer-events: auto;
      padding: 15px 18px 15px 46px;
      border-radius: 14px;
      font-family: 'DM Sans', sans-serif;
      font-size: 14px;
      font-weight: 600;
      line-height: 1.35;
      color: var(--off);
      border: 1px solid var(--border);
      background: #141414;
      box-shadow: 0 20px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(200,245,74,0.08);
      position: relative;
      opacity: 0;
      transform: translateY(14px);
      transition: opacity 0.28s ease, transform 0.28s ease;
    }
    .toast::before {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 20px;
      line-height: 1;
    }
    .toast--show { opacity: 1; transform: translateY(0); }
    .toast--hide { opacity: 0; transform: translateY(8px); }
    .toast--ok {
      border-color: rgba(200,245,74,0.4);
      background: linear-gradient(145deg, #161a10 0%, #111 100%);
      box-shadow: 0 20px 50px rgba(0,0,0,0.55), 0 0 28px rgba(200,245,74,0.12);
    }
    .toast--ok::before { content: '✓'; color: var(--accent); }
    .toast--bad {
      border-color: rgba(255,95,87,0.35);
      background: linear-gradient(145deg, #1a1212 0%, #111 100%);
    }
    .toast--bad::before { content: '!'; font-family: 'Bebas Neue', sans-serif; color: #ff5f57; font-size: 24px; }
    .toast subline {
      display: block;
      margin-top: 8px;
      font-size: 12px;
      font-weight: 400;
      color: var(--muted);
      font-family: 'DM Mono', monospace;
      line-height: 1.45;
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="panel">
      <div class="panel-topshine" aria-hidden="true"></div>
      <div class="panel-inner">
        <div class="panel-head">
          <p class="panel-kicker">Poster workflow · admin</p>
          <h1 class="panel-title">Create preview links</h1>
        </div>
        <div class="field">
          <label><span>Order</span> — # or ID</label>
          <div class="field-inner"><input id="orderRef" placeholder="#4821" autocomplete="off" /></div>
        </div>
        <div class="field">
          <label><span>Poster title</span> — optional</label>
          <div class="field-inner"><input id="posterTitle" placeholder="2020 Dodge Challenger" autocomplete="off" /></div>
        </div>
        <div class="field">
          <label><span>Preview image URL</span> — https from Files</label>
          <div class="field-inner"><input id="previewUrl" placeholder="https://cdn.shopify.com/s/files/1/.../your-poster.jpg" autocomplete="off" /></div>
        </div>
        <div class="actions">
          <button type="button" id="createBtn">Create / Update Preview &amp; Get Link</button>
        </div>
      </div>
    </div>
    <div class="out-wrap">
      <div class="out-head">
        <span>Response</span>
        <div class="out-dots" aria-hidden="true"><span></span><span></span><span></span></div>
      </div>
      <pre id="out">Ready.</pre>
    </div>
  </div>
  <div id="toastRegion" class="toast-region" role="status" aria-live="polite" aria-atomic="true"></div>
<script>
  const out = document.getElementById('out');
  function log(obj) { out.textContent = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2); }
  function toast(line, kind, sub) {
    const region = document.getElementById('toastRegion');
    const el = document.createElement('div');
    el.className = 'toast toast--' + (kind === 'ok' ? 'ok' : 'bad');
    el.appendChild(document.createTextNode(line));
    if (sub) {
      const s = document.createElement('span');
      s.className = 'subline';
      s.textContent = sub;
      el.appendChild(s);
    }
    region.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('toast--show'); });
    var hideTimer = setTimeout(function () {
      el.classList.remove('toast--show');
      el.classList.add('toast--hide');
      setTimeout(function () { el.remove(); }, 300);
    }, 4800);
    el.addEventListener('click', function () {
      clearTimeout(hideTimer);
      el.classList.remove('toast--show');
      el.classList.add('toast--hide');
      setTimeout(function () { el.remove(); }, 300);
    });
    el.style.cursor = 'pointer';
    el.title = 'Dismiss';
  }
  async function post(path, body) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    });
    const text = await res.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }
    if (!res.ok || data.ok === false) {
      const msg =
        data.error ||
        (text && !data.error && !text.trimStart().startsWith('{') ? text.trim().slice(0, 280) : '') ||
        'HTTP ' + res.status;
      throw new Error(msg);
    }
    return data;
  }
  function getRef() { return (document.getElementById('orderRef').value || '').trim(); }
  function getTitle() { return (document.getElementById('posterTitle').value || '').trim(); }
  function getUrl() { return (document.getElementById('previewUrl').value || '').trim(); }

  document.getElementById('createBtn').addEventListener('click', async () => {
    try {
      const ref = getRef();
      const preview_image_url = getUrl();
      if (!ref) {
        log('Enter an order number or order id.');
        toast('Add an order number or ID', 'bad');
        return;
      }
      if (!preview_image_url) {
        log('Paste the preview image URL.');
        toast('Paste the preview image URL', 'bad');
        return;
      }
      const data = await post('/admin/api/upsert', { ref, poster_title: getTitle(), preview_image_url });
      log(data);
      toast('Link ready', 'ok', 'Copy approve_url from Response for the customer.');
    } catch (e) {
      const msg = e.message || 'error';
      log({ ok:false, error: msg });
      toast('Could not save preview', 'bad', msg);
    }
  });
</script>
</body>
</html>`;
}

