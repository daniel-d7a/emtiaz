(async () => {
  try {
    const res = await fetch('/api/public/site');
    if (!res.ok) return;
    const { branding, support } = await res.json();
    const root = document.documentElement;
    if (branding?.primaryColor) {
      root.style.setProperty('--primary', branding.primaryColor);
      root.style.setProperty('--primary-dark', `color-mix(in srgb, ${branding.primaryColor} 70%, black)`);
      root.style.setProperty('--primary-light', `color-mix(in srgb, ${branding.primaryColor} 14%, white)`);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', branding.primaryColor);
    }
    if (branding?.secondaryColor) {
      root.style.setProperty('--secondary', branding.secondaryColor);
      root.style.setProperty('--secondary-light', `color-mix(in srgb, ${branding.secondaryColor} 14%, white)`);
    }
    if (branding?.logoUrl) {
      root.style.setProperty('--site-logo', `url("${branding.logoUrl}")`);
      root.classList.add('has-site-logo');
    }
    const footer = document.querySelector('.footer-inner');
    if (footer && support) {
      const links = [
        support.email && ['mailto:' + support.email, support.email],
        support.phone && ['tel:' + support.phone, support.phone],
        support.whatsapp && ['https://wa.me/' + support.whatsapp.replace(/\D/g, ''), 'WhatsApp'],
      ].filter(Boolean);
      if (links.length) {
        const box = document.createElement('div');
        box.className = 'footer-support';
        for (const [href, label] of links) {
          const a = document.createElement('a');
          a.href = href;
          a.textContent = label;
          if (href.startsWith('https://')) { a.target = '_blank'; a.rel = 'noreferrer'; }
          box.appendChild(a);
        }
        footer.appendChild(box);
      }
    }
  } catch {
    // Branding is progressive enhancement; static defaults stay.
  }
})();
