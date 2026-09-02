import React, { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Palette, Check, X, Sparkles } from 'lucide-react';

export default function ThemeSelectorModal({ isOpen, onClose }) {
  const { theme, setTheme, themes } = useTheme();

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        id="theme-selector-modal"
        className="modal-container theme-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="theme-modal-title"
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)'
              }}
            >
              <Palette size={20} />
            </div>
            <div>
              <h2 id="theme-modal-title" className="modal-title" style={{ fontSize: '1.15rem' }}>
                Appearance & Personalization
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>
                Settings / Workspace Theme Customization
              </p>
            </div>
          </div>
          <button
            id="btn-close-theme-modal"
            type="button"
            className="btn-icon-subtle"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '1.25rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginBottom: '1.25rem' }}>
            Select a color theme tailored for financial management and reporting. Your selection is automatically saved.
          </p>

          <div className="theme-grid">
            {themes.map((t) => {
              const isSelected = theme === t.id;
              return (
                <button
                  key={t.id}
                  id={`btn-select-theme-${t.id}`}
                  type="button"
                  className={`theme-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setTheme(t.id)}
                  aria-pressed={isSelected}
                >
                  {/* Theme Header */}
                  <div className="theme-card-header">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                      <span className="theme-card-title">{t.name}</span>
                      <span className="theme-card-desc">{t.description}</span>
                    </div>
                    <div className={`theme-card-radio ${isSelected ? 'active' : ''}`}>
                      {isSelected && <Check size={13} color="#ffffff" />}
                    </div>
                  </div>

                  {/* Swatches Preview Bar */}
                  <div className="theme-swatch-bar">
                    <div
                      className="theme-swatch-chip"
                      style={{ background: t.preview.bg }}
                      title="Background"
                    />
                    <div
                      className="theme-swatch-chip"
                      style={{ background: t.preview.card }}
                      title="Surface Card"
                    />
                    <div
                      className="theme-swatch-chip"
                      style={{ background: t.preview.elevated || t.preview.card }}
                      title="Elevated Panel"
                    />
                    <div
                      className="theme-swatch-chip"
                      style={{ background: t.preview.accent }}
                      title="Accent"
                    />
                    {t.preview.chart && (
                      <div className="theme-swatch-chart-group" title="Chart Palette">
                        {t.preview.chart.slice(0, 4).map((c, i) => (
                          <span
                            key={i}
                            className="theme-chart-dot"
                            style={{ background: c }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Active theme: <strong style={{ color: 'var(--text-primary)' }}>{themes.find((t) => t.id === theme)?.name || 'Default'}</strong>
          </span>
          <button
            id="btn-done-theme-modal"
            type="button"
            className="btn-primary"
            onClick={onClose}
            style={{ padding: '0.45rem 1.25rem', fontSize: '0.85rem' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
