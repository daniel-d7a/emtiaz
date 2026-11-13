import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import { IconButton } from './IconButton';

export type ActionMenuItem = {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
};

export function ActionMenu({
  label,
  items,
  align = 'end',
}: {
  label: string;
  items: ActionMenuItem[];
  align?: 'start' | 'end';
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onScrollOrResize = () => {
      setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open]);

  if (!items.length) return null;

  const handleToggle = () => {
    if (!open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenUp = spaceBelow < 220 && spaceAbove > 220;
      const isRtl = document.documentElement.dir === 'rtl';

      const style: CSSProperties = {
        position: 'fixed',
        maxWidth: 'calc(100vw - 16px)',
      };

      if (shouldOpenUp) {
        style.bottom = `${Math.max(8, window.innerHeight - rect.top + 4)}px`;
      } else {
        style.top = `${Math.max(8, rect.bottom + 4)}px`;
      }

      if (align === 'end') {
        if (isRtl) {
          style.left = `${Math.max(8, rect.left)}px`;
        } else {
          style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
        }
      } else {
        if (isRtl) {
          style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
        } else {
          style.left = `${Math.max(8, rect.left)}px`;
        }
      }

      setMenuStyle(style);
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative inline-flex">
      <IconButton
        label={label}
        ariaHasPopup="menu"
        ariaExpanded={open}
        onClick={handleToggle}
      >
        <MoreVertical size={16} />
      </IconButton>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <button
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[60] cursor-default bg-transparent"
            />
            <div
              role="menu"
              style={menuStyle}
              className="popover-enter fixed z-[70] min-w-44 rounded-xl border border-line bg-surface p-1 shadow-lg"
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    setOpen(false);
                    item.onClick();
                  }}
                  className={`flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-start text-sm font-semibold transition disabled:opacity-40 ${
                    item.danger
                      ? 'text-danger hover:bg-danger/10'
                      : 'text-ink hover:bg-line/40'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
