import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GraduationCap } from 'lucide-react';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import type { PublicSite } from '../../../shared/api';

export const siteQuery = {
  queryKey: ['public-site'],
  queryFn: () => api<PublicSite>('/api/public/site'),
  staleTime: 60_000,
};

export function useSite() {
  return useQuery(siteQuery);
}

export function SiteBranding() {
  const { data } = useSite();
  useEffect(() => {
    if (!data?.branding) return;
    const root = document.documentElement.style;
    const { primaryColor, secondaryColor } = data.branding;
    root.setProperty('--color-primary', primaryColor);
    root.setProperty('--color-primary-dark', `color-mix(in srgb, ${primaryColor} 70%, black)`);
    root.setProperty('--color-primary-light', `color-mix(in srgb, ${primaryColor} 14%, white)`);
    root.setProperty('--color-secondary', secondaryColor);
    root.setProperty('--color-secondary-light', `color-mix(in srgb, ${secondaryColor} 14%, white)`);
  }, [data]);
  return null;
}

export function BrandMark({ size = 22 }: { size?: number }) {
  const { t } = useLang();
  const { data } = useSite();
  const logo = data?.branding?.logoUrl;
  return logo ? (
    <img src={logo} alt={t('appName')} className="h-7 w-auto object-contain" />
  ) : (
    <>
      <GraduationCap size={size} />
      <span className="truncate">{t('appName')}</span>
    </>
  );
}
