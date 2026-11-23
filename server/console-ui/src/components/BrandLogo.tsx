import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  withWordmark?: boolean;
  subtitle?: string;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  withWordmark = true,
  subtitle,
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base sm:text-lg',
    lg: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Original Shield + Pulse Node SVG Logo */}
      <div className={`${iconSizes[size]} shrink-0 relative flex items-center justify-center`}>
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_0_12px_rgba(56,189,248,0.35)]"
          aria-label="EdgeShield Logo"
        >
          <defs>
            <linearGradient id="esShieldGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <linearGradient id="esPulseGrad" x1="7" y1="16" x2="25" y2="16" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#7dd3fc" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
          </defs>
          {/* Shield Outer Contour */}
          <path
            d="M16 3L5 7.2v8.5c0 7.2 4.7 11.8 11 13.3 6.3-1.5 11-6.1 11-13.3V7.2L16 3z"
            fill="#091122"
            stroke="url(#esShieldGrad)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Telemetry Wave Signal Traversing Shield */}
          <path
            d="M9 16.2h3.2l2-3.8 3.6 7.4 2-3.6H23"
            stroke="url(#esPulseGrad)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Central Beacon Node */}
          <circle cx="16" cy="16" r="2" fill="#38bdf8" />
        </svg>
      </div>

      {withWordmark && (
        <div className="flex flex-col">
          <div className={`font-bold tracking-tight leading-none ${textSizes[size]}`}>
            <span className="text-white">Edge</span>
            <span className="text-sky-400">Shield</span>
          </div>
          {subtitle && (
            <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase mt-1">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
