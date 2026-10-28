import { Mail, MessageCircle, Phone } from 'lucide-react';
import { useLang } from '../lib/i18n';
import type { PublicSupport } from '../../../shared/api';

type Contact = { email: string | null; phone: string | null; whatsapp: string | null };

function whatsappHref(phone: string) {
  return `https://wa.me/${phone.replace(/[^\d]/g, '')}`;
}

function ContactRows({ contact }: { contact: Contact }) {
  const { t } = useLang();
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {contact.email && (
        <li>
          <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-primary hover:underline">
            <Mail size={16} /> <span dir="ltr">{contact.email}</span>
          </a>
        </li>
      )}
      {contact.phone && (
        <li>
          <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-primary hover:underline">
            <Phone size={16} /> <span dir="ltr">{contact.phone}</span>
          </a>
        </li>
      )}
      {contact.whatsapp && (
        <li>
          <a
            href={whatsappHref(contact.whatsapp)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <MessageCircle size={16} /> {t('whatsapp')}
          </a>
        </li>
      )}
    </ul>
  );
}

export function PublicFooter({
  teacher,
  support,
}: {
  teacher: { name: string; email: string | null; phoneNumber: string | null };
  support: PublicSupport;
}) {
  const { t } = useLang();
  const teacherContact = {
    email: teacher.email,
    phone: teacher.phoneNumber,
    whatsapp: teacher.phoneNumber,
  };
  const hasTeacher = !!(teacherContact.email || teacherContact.phone || teacherContact.whatsapp);
  const hasSupport = !!(support.email || support.phone || support.whatsapp);
  if (!hasTeacher && !hasSupport) return null;
  return (
    <footer className="mt-8 grid gap-4 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-2">
      {hasTeacher && (
        <section>
          <h2 className="mb-2 font-bold">{t('teacherContact')}</h2>
          <p className="mb-2 text-sm text-ink-soft">{teacher.name}</p>
          <ContactRows contact={teacherContact} />
        </section>
      )}
      {hasSupport && (
        <section>
          <h2 className="mb-2 font-bold">{t('platformSupport')}</h2>
          <ContactRows contact={support} />
        </section>
      )}
    </footer>
  );
}
