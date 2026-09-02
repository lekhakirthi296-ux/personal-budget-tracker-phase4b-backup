import React from 'react';

/**
 * Polished Budget & Finance Logo
 * Works seamlessly across dark and light surfaces, scaling cleanly from 24px to 64px.
 */
export default function BrandLogo({ size = 40, className = '' }) {
  return (
    <div
      className={`brand-logo-container ${className}`}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          {/* Main Brand Accent Gradient */}
          <linearGradient id="pbtLogoGrad" x1="4" y1="4" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--accent-primary, #6366f1)" />
            <stop offset="1" stopColor="var(--accent-secondary, #8b5cf6)" />
          </linearGradient>

          {/* Surface Shield Gradient */}
          <linearGradient id="pbtBgGrad" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--bg-card, #171f30)" stopOpacity="0.95" />
            <stop offset="1" stopColor="var(--bg-secondary, #111622)" stopOpacity="0.98" />
          </linearGradient>

          {/* Highlight Accent */}
          <linearGradient id="pbtBarGrad" x1="12" y1="28" x2="32" y2="12" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--accent-primary, #6366f1)" />
            <stop offset="0.6" stopColor="var(--accent-secondary, #8b5cf6)" />
            <stop offset="1" stopColor="var(--text-primary, #ffffff)" />
          </linearGradient>
        </defs>

        {/* Outer Rounded Squircle Badge */}
        <rect
          x="1.5"
          y="1.5"
          width="41"
          height="41"
          rx="11"
          fill="url(#pbtBgGrad)"
          stroke="var(--border-color, rgba(255,255,255,0.12))"
          strokeWidth="1.5"
        />

        {/* Subtle Inner Frame Glow */}
        <rect
          x="3.5"
          y="3.5"
          width="37"
          height="37"
          rx="9"
          fill="none"
          stroke="url(#pbtLogoGrad)"
          strokeWidth="1"
          strokeOpacity="0.3"
        />

        {/* Finance Bar 1 (Left - Foundation / Balance) */}
        <rect
          x="12"
          y="22"
          width="4"
          height="10"
          rx="2"
          fill="var(--accent-primary, #6366f1)"
          fillOpacity="0.45"
        />

        {/* Finance Bar 2 (Middle - Growth) */}
        <rect
          x="18"
          y="17"
          width="4"
          height="15"
          rx="2"
          fill="var(--accent-primary, #6366f1)"
          fillOpacity="0.75"
        />

        {/* Finance Bar 3 (Right - Target / Peak) */}
        <rect
          x="24"
          y="12"
          width="4"
          height="20"
          rx="2"
          fill="url(#pbtLogoGrad)"
        />

        {/* Dynamic Trajectory Curve with Apex Node */}
        <path
          d="M10 26C16 25 21 18 31 11"
          stroke="url(#pbtBarGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Top Right Apex Star / Diamond Node */}
        <circle
          cx="31"
          cy="11"
          r="3"
          fill="#ffffff"
          stroke="var(--accent-primary, #6366f1)"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}
