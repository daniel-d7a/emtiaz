import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import type { TeacherTheme } from '../../../shared/api';
import { normalizeTheme, themeStyle } from '../lib/theme';
import { useLang } from '../lib/i18n';

function Marquee({ text, tone }: { text: string; tone: 'primary' | 'white' }) {
  const { lang } = useLang();
  const wrapRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(2);
  const textClass = tone === 'white' ? 'text-white' : 'text-primary';

  useEffect(() => {
    const measure = () => {
      const wrapWidth = wrapRef.current?.clientWidth ?? 0;
      const textWidth = textRef.current?.getBoundingClientRect().width ?? 0;
      if (!wrapWidth || !textWidth) return;
      const ratio = textWidth / wrapWidth;
      setCount(ratio >= 0.7 ? 2 : ratio < 0.3 ? 4 : ratio < 0.5 ? 3 : 2);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (wrapRef.current) observer.observe(wrapRef.current);
    if (textRef.current) observer.observe(textRef.current);
    void document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, [text, lang]);

  return (
    <div ref={wrapRef} className="relative overflow-hidden">
      <span
        ref={textRef}
        aria-hidden
        className={`invisible absolute whitespace-nowrap text-sm font-semibold ${textClass}`}
      >
        {text}
      </span>
      <div
        className={`marquee-track flex w-max whitespace-nowrap px-4 text-sm font-semibold ${textClass}`}
        style={{ '--marquee-count': count } as CSSProperties}
      >
        {Array.from({ length: count }, (_, index) => (
          <span key={index} className="pe-8">{text}</span>
        ))}
      </div>
    </div>
  );
}

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
  isTopTeacher,
  showMarquee = true,
  children,
}: {
  theme: TeacherTheme | null | undefined;
  bannerUrl: string | null;
  name: string;
  subject?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  isTopTeacher?: boolean;
  showMarquee?: boolean;
  children?: ReactNode;
}) {
  const { lang } = useLang();
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
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{name}</h1>
                {isTopTeacher && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-amber-400/20 to-yellow-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-700 shadow-sm"
                    title={lang === 'ar' ? 'معلّم متميّز' : 'Top Teacher'}
                  >
                    <Sparkles size={13} className="text-amber-500 fill-amber-400" />
                    {lang === 'ar' ? 'معلّم متميّز' : 'Top Teacher'}
                  </span>
                )}
              </div>
              {subject && <p className="text-sm font-semibold text-primary">{subject}</p>}
            </div>
          </div>
          {bio && <p className="mt-4 whitespace-pre-wrap text-sm text-ink-soft">{bio}</p>}
          {children && <div className="mt-4">{children}</div>}
        </div>
      </div>
      {showMarquee && t.marquee && (
        <div className="border-t border-line bg-primary-light/40 py-2">
          <Marquee text={t.marquee} tone="primary" />
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
      className="relative mb-5 h-56 overflow-hidden rounded-2xl border border-line"
      style={bannerUrl ? undefined : { background: `linear-gradient(135deg, ${t.primary}, ${t.secondary})` }}
    >
      {bannerUrl && <img src={bannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      {t.marquee && (
        <div className="absolute inset-x-0 bottom-0 bg-ink/40 py-1.5">
          <Marquee text={t.marquee} tone="white" />
        </div>
      )}
    </div>
  );
}
