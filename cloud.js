// Cloud layer: Supabase Auth (sign up, sign in, reset password), lab data in Postgres (RLS),
// documents in a private Storage bucket. Only loaded when config.js has a Supabase URL.
import { SUPABASE_URL, SUPABASE_KEY, FILE_BUCKET, IDLE_LOCK_MINUTES } from './config.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function isGuest() { try { sessionStorage.removeItem('lab-guest'); } catch {} return false; }
export const cloudEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY);
let client = null, user = null, version = 0, saveTimer = null, pending = null, saving = false, onConflict = null;

function loadLibrary() {
  if (window.supabase?.createClient) return Promise.resolve();
  return new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = './vendor/supabase.js'; s.onload = resolve; s.onerror = () => reject(new Error('Không tải được thư viện Supabase.')); document.head.append(s); });
}
function friendly(error) {
  const m = String(error?.message || error || '');
  if (/Invalid login credentials/i.test(m)) return 'Email hoặc mật khẩu không đúng.';
  if (/Email not confirmed/i.test(m)) return 'Email chưa được xác minh. Hãy mở thư xác minh trong hộp thư của bạn.';
  if (/User already registered/i.test(m)) return 'Email này đã có tài khoản. Hãy đăng nhập.';
  if (/Database error saving new user|signups? (are )?not allowed|Signups not allowed/i.test(m)) return 'Lab đã có chủ, đăng ký tài khoản mới đã bị khóa.';
  if (/rate limit|too many/i.test(m)) return 'Thử quá nhiều lần. Hãy đợi vài phút rồi thử lại.';
  if (/Password should be|weak/i.test(m)) return 'Mật khẩu quá yếu. Dùng ít nhất 10 ký tự gồm chữ và số.';
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.';
  if (/same.*password|different from the old/i.test(m)) return 'Mật khẩu mới phải khác mật khẩu cũ.';
  return m || 'Có lỗi xảy ra.';
}
export function passwordScore(pw) {
  let s = 0; if (pw.length >= 10) s++; if (pw.length >= 14) s++; if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++; if (/\d/.test(pw)) s++; if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}
function passwordProblem(pw) {
  if (pw.length < 10) return 'Mật khẩu cần ít nhất 10 ký tự.';
  if (!/[A-Za-zÀ-ỹ]/.test(pw) || !/\d/.test(pw)) return 'Mật khẩu cần có cả chữ và số.';
  if (pw.length > 72) return 'Mật khẩu tối đa 72 ký tự.';
  return '';
}
export function setStatus(kind, text) {
  const el = $('#sync-status'); if (!el) return; el.classList.remove('cloud', 'syncing', 'offline'); if (kind) el.classList.add(kind); const span = el.querySelector('span'); if (span) span.textContent = text;
}

// ---------------- Auth screen ----------------
function authScreen(mode = 'signin', message = '', tone = '') {
  let root = $('#auth-screen');
  if (!root) { root = document.createElement('div'); root.id = 'auth-screen'; root.className = 'auth-screen'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); document.body.append(root); }
  const titles = { signin: ['Chào mừng trở lại.', 'Đăng nhập để vào phòng lab của bạn.'], signup: ['Tạo phòng lab.', 'Tài khoản đầu tiên sẽ là chủ lab. Sau đó đăng ký được khóa.'], forgot: ['Quên mật khẩu?', 'Nhập email, mình sẽ gửi liên kết đặt lại mật khẩu.'], recovery: ['Đặt mật khẩu mới.', 'Chọn một mật khẩu mạnh cho tài khoản của bạn.'] };
  const [h, p] = titles[mode];
  const pwField = (id, label, auto) => `<label for="${id}">${label}</label><input id="${id}" name="${id}" type="password" required minlength="${mode === 'signin' ? 1 : 10}" maxlength="72" autocomplete="${auto}">`;
  root.innerHTML = `<div class="auth-card"><div class="auth-brand"><svg class="icon" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 3v3m6-3v3M9 18v3m6-3v3M3 9h3m-3 6h3m12-6h3m-3 6h3"/></svg>MY LAB</div>
  ${mode === 'signin' || mode === 'signup' ? `<div class="auth-tabs"><button type="button" data-mode="signin" aria-pressed="${mode === 'signin'}">Đăng nhập</button><button type="button" data-mode="signup" aria-pressed="${mode === 'signup'}">Đăng ký</button></div>` : ''}
  <h1>${h}</h1><p>${p}</p>
  <form id="auth-form" novalidate>
  ${mode !== 'recovery' ? `<label for="auth-email">Email</label><input id="auth-email" name="email" type="email" required maxlength="254" autocomplete="email" autofocus>` : ''}
  ${mode === 'signin' ? pwField('auth-password', 'Mật khẩu', 'current-password') : ''}
  ${mode === 'signup' || mode === 'recovery' ? pwField('auth-password', 'Mật khẩu (ít nhất 10 ký tự, có chữ và số)', 'new-password') + '<div class="pw-meter"><span></span></div><div class="pw-hint" id="pw-hint"></div>' + pwField('auth-password2', 'Nhập lại mật khẩu', 'new-password') : ''}
  <button class="btn primary" type="submit">${{ signin: 'Đăng nhập', signup: 'Tạo tài khoản', forgot: 'Gửi liên kết đặt lại', recovery: 'Lưu mật khẩu mới' }[mode]}</button>
  <div class="auth-msg ${tone}" role="status">${esc(message)}</div></form>
  <div class="auth-links">${mode === 'signin' ? '<button type="button" data-mode="forgot">Quên mật khẩu?</button>' : mode !== 'recovery' ? '<button type="button" data-mode="signin">← Quay lại đăng nhập</button>' : ''}</div>
  <p class="auth-foot">Kết nối được mã hóa HTTPS. Dữ liệu của bạn được bảo vệ bằng phân quyền theo từng tài khoản (Row Level Security); tệp tài liệu nằm trong kho riêng tư. Phiên tự khóa sau ${IDLE_LOCK_MINUTES} phút không thao tác.</p></div>`;
  root.hidden = false; document.body.classList.add('auth-mode');
  root.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => authScreen(b.dataset.mode)));
  const pw = $('#auth-password', root);
  if (pw && (mode === 'signup' || mode === 'recovery')) pw.addEventListener('input', () => { const sc = passwordScore(pw.value); const bar = root.querySelector('.pw-meter span'); bar.style.width = `${(sc + 1) * 20}%`; bar.style.background = ['#ff8f9b', '#ff8f9b', '#e6c27a', '#8fe9c0', '#6ce9d9'][sc]; $('#pw-hint', root).textContent = passwordProblem(pw.value) || ['Yếu', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'][sc]; });
  $('#auth-form', root).addEventListener('submit', e => { e.preventDefault(); submitAuth(mode, root); });
  setTimeout(() => (root.querySelector('input') || root).focus(), 30);
  return root;
}
let authResolve = null;
async function submitAuth(mode, root) {
  const msg = root.querySelector('.auth-msg'), btn = root.querySelector('button[type=submit]');
  const show = (text, tone = 'error') => { msg.textContent = text; msg.className = 'auth-msg ' + tone; };
  const email = $('#auth-email', root)?.value.trim().toLowerCase(), pw = $('#auth-password', root)?.value || '', pw2 = $('#auth-password2', root)?.value;
  if (mode !== 'recovery' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) return show('Email chưa đúng định dạng.');
  if (mode === 'signup' || mode === 'recovery') { const prob = passwordProblem(pw); if (prob) return show(prob); if (pw !== pw2) return show('Hai mật khẩu chưa khớp.'); }
  if (mode === 'signin' && !pw) return show('Hãy nhập mật khẩu.');
  btn.disabled = true; show('Đang xử lý…', '');
  const redirect = location.origin + location.pathname;
  try {
    if (mode === 'signin') { const { data, error } = await client.auth.signInWithPassword({ email, password: pw }); if (error) throw error; finishAuth(data.session); return; }
    if (mode === 'signup') {
      const { data, error } = await client.auth.signUp({ email, password: pw, options: { emailRedirectTo: redirect } }); if (error) throw error;
      if (data.session) { finishAuth(data.session); return; }
      authScreen('signin', 'Đã tạo tài khoản. Mở email xác minh vừa gửi tới ' + email + ', bấm liên kết rồi đăng nhập.', 'ok'); return;
    }
    if (mode === 'forgot') { const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: redirect }); if (error) throw error; show('Nếu email có tài khoản, liên kết đặt lại mật khẩu đã được gửi. Kiểm tra cả thư rác.', 'ok'); btn.disabled = false; return; }
    if (mode === 'recovery') { const { error } = await client.auth.updateUser({ password: pw }); if (error) throw error; const { data } = await client.auth.getSession(); history.replaceState(null, '', location.pathname); finishAuth(data.session, 'Đã đổi mật khẩu.'); return; }
  } catch (err) { show(friendly(err)); btn.disabled = false; }
}
let welcomeNote = '';
function finishAuth(session, note = '') { if (!session) return; welcomeNote = note; user = session.user; const root = $('#auth-screen'); if (root) root.hidden = true; document.body.classList.remove('auth-mode'); authResolve?.(session); authResolve = null; }

// ---------------- Public API ----------------
export async function startCloud() {
  await loadLibrary();
  client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } });
  const hash = new URLSearchParams(location.hash.slice(1)); const query = new URLSearchParams(location.search);
  const linkError = hash.get('error_description') || query.get('error_description');
  let recovery = hash.get('type') === 'recovery';
  const session = await new Promise(resolve => {
    authResolve = resolve;
    client.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') { recovery = true; authScreen('recovery'); }
      else if (event === 'SIGNED_OUT') { if (user) location.reload(); }
      else if (s && !recovery && authResolve && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) finishAuth(s);
    });
    client.auth.getSession().then(({ data }) => {
      if (recovery) { authScreen('recovery'); return; }
      if (data.session) finishAuth(data.session);
      else authScreen('signin', linkError ? 'Liên kết không hợp lệ hoặc đã hết hạn. ' + linkError : '', linkError ? 'error' : '');
    }).catch(err => authScreen('signin', friendly(err), 'error'));
  });
  if (location.search.includes('code=')) history.replaceState(null, '', location.pathname + location.hash);
  user = session.user; startIdleLock();
  return { user: { id: user.id, email: user.email }, note: welcomeNote };
}

export async function loadRemoteState() {
  setStatus('syncing', 'Đang tải…');
  const { data, error } = await client.from('lab_state').select('data,version').eq('user_id', user.id).maybeSingle();
  if (error) { setStatus('offline', 'Lỗi tải dữ liệu'); throw new Error(friendly(error)); }
  if (!data) { version = 0; setStatus('cloud', 'Đã đồng bộ'); return null; }
  version = data.version; setStatus('cloud', 'Đã đồng bộ'); return data.data;
}

export function queueSave(state, conflictHandler) {
  onConflict = conflictHandler; pending = state; setStatus('syncing', 'Chưa lưu…');
  clearTimeout(saveTimer); saveTimer = setTimeout(flush, 700);
}
async function flush() {
  if (saving || !pending) return; saving = true; const snapshot = JSON.parse(JSON.stringify(pending)); pending = null; setStatus('syncing', 'Đang lưu…');
  try {
    if (version === 0) {
      const { error } = await client.from('lab_state').insert({ user_id: user.id, data: snapshot, version: 1 }); if (error) throw error; version = 1;
    } else {
      const { data, error } = await client.from('lab_state').update({ data: snapshot, version: version + 1, updated_at: new Date().toISOString() }).eq('user_id', user.id).eq('version', version).select('version'); if (error) throw error;
      if (!data.length) { setStatus('offline', 'Xung đột dữ liệu'); saving = false; onConflict?.(); return; }
      version = data[0].version;
    }
    setStatus('cloud', 'Đã đồng bộ');
  } catch (err) { setStatus('offline', 'Chưa lưu được'); pending = pending || snapshot; console.warn('Save failed:', err); setTimeout(flush, 5000); }
  saving = false; if (pending) flush();
}
export function hasPendingSave() { return Boolean(pending || saving); }
window.addEventListener('beforeunload', e => { if (cloudEnabled && hasPendingSave()) { e.preventDefault(); e.returnValue = ''; } });

export async function signOut() { await flush(); await client.auth.signOut(); location.hash = ''; location.reload(); }
export async function changePassword(pw) { const prob = passwordProblem(pw); if (prob) throw new Error(prob); const { error } = await client.auth.updateUser({ password: pw }); if (error) throw new Error(friendly(error)); }
export function getClient() { return client; }
export function currentUser() { return user ? { id: user.id, email: user.email } : null; }

// ---------------- Files ----------------
const MAX_FILE = 50 * 1024 * 1024;
export async function uploadFile(file, onProgress = () => {}) {
  if (file.size > MAX_FILE) throw new Error('Tệp tối đa 50 MB.');
  const safe = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^\w.-]+/g, '_').slice(-80) || 'tep';
  const path = `${user.id}/${crypto.randomUUID()}-${safe}`;
  onProgress(10);
  const { error } = await client.storage.from(FILE_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || 'application/octet-stream' });
  if (error) throw new Error(friendly(error));
  onProgress(100);
  return { path, name: file.name.slice(0, 200), size: file.size, type: (file.type || '').slice(0, 100) };
}
export async function fileUrl(path, download = false) {
  const { data, error } = await client.storage.from(FILE_BUCKET).createSignedUrl(path, 300, download ? { download: true } : undefined);
  if (error) throw new Error(friendly(error)); return data.signedUrl;
}
export async function removeFile(path) { const { error } = await client.storage.from(FILE_BUCKET).remove([path]); if (error) console.warn('Remove failed:', error.message); }

// ---------------- Idle lock ----------------
function startIdleLock() {
  let last = Date.now();
  for (const ev of ['pointerdown', 'keydown', 'wheel', 'touchstart']) addEventListener(ev, () => { last = Date.now(); }, { passive: true });
  setInterval(async () => { if (Date.now() - last > IDLE_LOCK_MINUTES * 60000) { try { sessionStorage.setItem('lab-locked', '1'); } catch {} await signOut(); } }, 30000);
}
export function consumeLockNotice() { try { const v = sessionStorage.getItem('lab-locked'); sessionStorage.removeItem('lab-locked'); return Boolean(v); } catch { return false; } }
