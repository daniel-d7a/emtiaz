import type { PresignedUpload } from '../../../shared/api';
import { api } from './api';

export async function uploadFile(endpoint: string, file: File) {
  const up = await api<PresignedUpload>(endpoint, {
    body: { fileName: file.name, mimeType: file.type, fileSizeBytes: file.size },
  });
  const put = await fetch(up.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!put.ok) throw new Error(`Upload failed: ${put.status}`);
  return up.objectKey;
}

export async function deleteUploadedObject(objectKey?: string | null) {
  if (!objectKey) return;
  try {
    await api('/api/storage/uploaded', { method: 'DELETE', body: { objectKey } });
  } catch {
    // Best-effort cleanup; the original save error is more useful to the user.
  }
}
