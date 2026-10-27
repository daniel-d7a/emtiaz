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

export function attachmentUrl(attachment: { id: string; url: string | null }) {
  return attachment.url ?? `/api/storage/attachments/${attachment.id}/file`;
}
