import { Archive, File, FileText, Image as ImageIcon, Link2, Music, Video } from 'lucide-react';
import type { AttachmentType } from '../../../shared/api';

export const previewableTypes = new Set<AttachmentType>(['IMAGE', 'PDF', 'VIDEO', 'AUDIO']);

export function attachmentIcon(type: AttachmentType) {
  switch (type) {
    case 'IMAGE': return ImageIcon;
    case 'VIDEO': return Video;
    case 'AUDIO': return Music;
    case 'ARCHIVE': return Archive;
    case 'LINK': return Link2;
    case 'DOC': return FileText;
    default: return File;
  }
}

export function isSafeHttpUrl(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

export function attachmentUrl(attachment: { id: string; url: string | null }) {
  return attachment.url ?? `/api/storage/attachments/${attachment.id}/file`;
}

export function homeworkFileUrl(hw: { id: string; url?: string | null; r2ObjectKey?: string | null }) {
  if (hw.url) return isSafeHttpUrl(hw.url) ? hw.url : '#';
  if (hw.r2ObjectKey) return `/api/storage/homework/${hw.id}/file`;
  return '#';
}

export function submissionFileUrl(sub: { id: string; url?: string | null; r2ObjectKey?: string | null }) {
  if (sub.url) return isSafeHttpUrl(sub.url) ? sub.url : '#';
  if (sub.r2ObjectKey) return `/api/storage/homework-submissions/${sub.id}/file`;
  return '#';
}
