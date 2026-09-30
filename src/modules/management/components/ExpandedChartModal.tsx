import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ExpandedChartModalProps {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
}

export function ExpandedChartModal({ title, subtitle, children, onClose }: ExpandedChartModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl h-[82vh] max-h-[90vh] bg-[var(--panel)] border border-[var(--line)] rounded-[16px] shadow-2xl p-4 flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0">
            <h2 className="text-[16px] text-[var(--text)] font-extrabold uppercase tracking-[0.4px] leading-tight">
              {title}
            </h2>
            {subtitle && (
              <div className="text-[12px] text-[var(--muted)] mt-1 italic leading-tight">
                {subtitle}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[var(--line)] bg-[var(--panel2)] text-[var(--text)] flex items-center justify-center hover:bg-[color-mix(in_srgb,var(--coral)_14%,var(--panel2))] hover:text-[var(--coral)] transition-colors shrink-0"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="relative flex-1 min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}
