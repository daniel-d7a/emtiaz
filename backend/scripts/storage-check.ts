/**
 * Storage self-check: presign → PUT bytes → objectExists → GET bytes via the real service.
 * Usage: npm run storage:check   (needs RustFS/R2 up and R2_* configured)
 */
import 'dotenv/config';
import { StorageService } from '../src/modules/storage/storage.service';

async function main() {
  const svc = new StorageService();
  if (!svc.isConfigured()) throw new Error('R2_* storage config missing — nothing to check');
  const key = `selfcheck/${Date.now()}.txt`;
  const bytes = new TextEncoder().encode('emtiaz storage check');

  const res = await fetch(await svc.presignedPut(key), { method: 'PUT', body: bytes });
  if (!res.ok) throw new Error(`PUT failed: ${res.status} ${await res.text()}`);
  if (!(await svc.objectExists(key))) throw new Error('objectExists=false after PUT');
  const text = await (await fetch(await svc.presignedGet(key))).text();
  if (text !== 'emtiaz storage check') throw new Error(`GET mismatch: ${text}`);
  console.log('roundtrip OK:', key);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
