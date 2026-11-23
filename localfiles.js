// Offline document store: files live in this browser's IndexedDB (same API as cloud.js files).
const DB = 'lab-tdv-files', STORE = 'files', MAX_FILE = 50 * 1024 * 1024;
const open = () => new Promise((resolve, reject) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(STORE); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
const run = async (mode, fn) => { const db = await open(); return new Promise((resolve, reject) => { const tx = db.transaction(STORE, mode); const req = fn(tx.objectStore(STORE)); tx.oncomplete = () => { db.close(); resolve(req?.result); }; tx.onerror = () => { db.close(); reject(tx.error); }; }); };
export async function uploadFile(file, onProgress = () => {}) {
  if (file.size > MAX_FILE) throw new Error('Tệp tối đa 50 MB.');
  const safe = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^\w.-]+/g, '_').slice(-80) || 'tep';
  const path = `local/${crypto.randomUUID()}-${safe}`;
  onProgress(10);
  try { await run('readwrite', s => s.put(file, path)); } catch { throw new Error('Trình duyệt không lưu được tệp (bộ nhớ đầy hoặc bị chặn).'); }
  onProgress(100);
  return { path, name: file.name.slice(0, 200), size: file.size, type: (file.type || '').slice(0, 100) };
}
export async function fileUrl(path) { const blob = await run('readonly', s => s.get(path)); if (!blob) throw new Error('Không tìm thấy tệp trong trình duyệt này.'); return URL.createObjectURL(blob); }
export async function removeFile(path) { try { await run('readwrite', s => s.delete(path)); } catch { /* ignore */ } }
