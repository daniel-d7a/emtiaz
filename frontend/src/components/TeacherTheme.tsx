import type { ReactNode } from 'react';
import type { TeacherTheme } from '../../../shared/api';
import { normalizeTheme, themeStyle } from '../lib/theme';
import { useLang } from '../lib/i18n';

export function ThemeSurface({
  theme,
  children,
  className = '',
}: {
  theme: TeacherTheme | null | undefined;
  children: ReactNode;
  className?: string;
}) {
  const { lang } = useLang();
  return (
    <div style={themeStyle(normalizeTheme(theme), lang)} className={className}>
      {children}
    </div>
  );
}

export function ThemeHero({
  theme,
  bannerUrl,
  name,
  subject,
  bio,
  avatarUrl,
  children,
}: {
  theme: TeacherTheme | null | undefined;
  bannerUrl: string | null;
  name: string;
  subject?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  children?: ReactNode;
}) {
  const t = normalizeTheme(theme);
  const background = { background: `linear-gradient(135deg, ${t.primary}, ${t.secondary})` };
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className={t.layout === 'split' ? 'grid md:grid-cols-2' : ''}>
        <div
          className={`relative ${t.layout === 'split' ? 'min-h-48 md:min-h-full' : 'h-44 sm:h-56'}`}
          style={background}
        >
          {bannerUrl && (
            <img src={bannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
        </div>
        <div className="flex flex-col justify-center p-5">
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full border border-line object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-light text-2xl font-bold text-primary">
                {name.slice(0, 1)}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-extrabold">{name}</h1>
              {subject && <p className="text-sm font-semibold text-primary">{subject}</p>}
            </div>
          </div>
          {bio && <p className="mt-4 whitespace-pre-wrap text-sm text-ink-soft">{bio}</p>}
          {children && <div className="mt-4">{children}</div>}
        </div>
      </div>
      {t.marquee && (
        <div className="overflow-hidden border-t border-line bg-primary-light/40 py-2" >
          <div className="marquee-track w-max whitespace-nowrap px-4 text-sm font-semibold text-primary">
            {t.marquee}
          </div>
        </div>
      )}
    </section>
  );
}

export function ThemeStrip({
  theme,
  bannerUrl,
}: {
  theme: TeacherTheme | null | undefined;
  bannerUrl: string | null;
}) {
  const t = normalizeTheme(theme);
  return (
    <div
      className="relative mb-5 h-24 overflow-hidden rounded-2xl border border-line"
      style={bannerUrl ? undefined : { background: `linear-gradient(135deg, ${t.primary}, ${t.secondary})` }}
    >
      {bannerUrl && <img src={bannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      {t.marquee && (
        <div className="absolute inset-x-0 bottom-0 overflow-hidden bg-ink/40 py-1.5" >
          <div className="marquee-track w-max whitespace-nowrap px-4 text-sm font-semibold text-white">
            {t.marquee}
          </div>
        </div>
      )}
    </div>
  );
}
