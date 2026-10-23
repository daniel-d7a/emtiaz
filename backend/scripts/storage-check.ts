/**
 * Storage self-check: presign → PUT bytes → objectExists → GET bytes via the real service.
 * Usage: npm run storage:check   (needs MinIO/R2 up; run without R2_* to test stub mode)
 */
import 'dotenv/config';
import { R2StorageService } from '../src/modules/storage/r2.service';

async function main() {
  const svc = new R2StorageService();
  const key = `selfcheck/${Date.now()}.txt`;
  const bytes = new TextEncoder().encode('emtiaz storage check');

  const putUrl = await svc.presignedPut(key);
  console.log('mode:', svc.isConfigured() ? 'R2/MinIO' : 'stub');
  const code = putUrl.includes('stub-upload') ? 'stub' : 'real';
  if (!putUrl.includes('stub-upload') && svc.isConfigured()) {
    const res = await fetch(putUrl, { method: 'PUT', body: bytes });
    if (!res.ok) throw new Error(`PUT failed: ${res.status} ${await res.text()}`);
    if (!(await svc.objectExists(key))) throw new Error('objectExists=false after PUT');
    const getUrl = await svc.presignedGet(key);
    const text = await (await fetch(getUrl)).text();
    if (text !== 'emtiaz storage check') throw new Error(`GET mismatch: ${text}`);
    console.log('roundtrip OK:', key);
  } else if (code === 'stub' && !svc.isConfigured()) {
    if (!(await svc.objectExists(key))) throw new Error('stub objectExists should be true');
    console.log('stub mode OK');
  } else {
    throw new Error('inconsistent mode');
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
