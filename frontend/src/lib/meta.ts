type PageMeta = {
  title: string;
  description: string;
  image?: string | null;
  type?: 'website' | 'article' | 'profile';
  locale?: 'ar' | 'en';
};

type Change = { element: HTMLMetaElement; previous: string | null; created: boolean };

export function applyPageMeta({ title, description, image, type = 'website', locale }: PageMeta) {
  const previousTitle = document.title;
  const changes: Change[] = [];
  document.title = title;

  const setMeta = (attr: 'name' | 'property', key: string, content: string) => {
    let element = Array.from(document.head.querySelectorAll('meta')).find(
      (meta) => meta.getAttribute(attr) === key,
    );
    const created = !element;
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attr, key);
      document.head.appendChild(element);
    }
    changes.push({ element, previous: created ? null : element.getAttribute('content'), created });
    element.setAttribute('content', content);
  };

  const url = window.location.href;
  const absolute = new URL(image || '/og.png', window.location.origin).href;

  setMeta('name', 'description', description);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:url', url);
  setMeta('property', 'og:type', type);
  setMeta('property', 'og:site_name', 'امتياز');
  setMeta('property', 'og:locale', (locale ?? document.documentElement.lang) === 'en' ? 'en_US' : 'ar_OM');
  setMeta('property', 'og:image', absolute);
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);
  setMeta('name', 'twitter:image', absolute);

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const createdCanonical = !canonical;
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  const previousCanonical = canonical.getAttribute('href');
  canonical.href = url;

  return () => {
    document.title = previousTitle;
    for (const { element, previous, created } of changes.reverse()) {
      if (created) {
        element.remove();
      } else if (previous === null) {
        element.removeAttribute('content');
      } else {
        element.setAttribute('content', previous);
      }
    }
    if (createdCanonical) canonical.remove();
    else if (previousCanonical === null) canonical.removeAttribute('href');
    else canonical.href = previousCanonical;
  };
}
