'use client';

import { cn } from '@walletz/ui';

/* ── Neural W mark — SVG symbol ── */
function NeuralWMark({ size = 40, className }: { size?: number; className?: string }) {
  const id = `wg-${size}`; // unique enough for same-page dedup
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* Ribbon gradient: violet → blue → cyan */}
        <linearGradient id={`${id}-ribbon`} x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#6D4AFF" />
          <stop offset="45%"  stopColor="#4F6AFF" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>

        {/* Sphere: violet */}
        <radialGradient id={`${id}-sv`} cx="38%" cy="32%" r="60%">
          <stop offset="0%"   stopColor="#A080FF" />
          <stop offset="100%" stopColor="#4825CC" />
        </radialGradient>
        {/* Sphere: mid-violet */}
        <radialGradient id={`${id}-sm`} cx="38%" cy="32%" r="60%">
          <stop offset="0%"   stopColor="#8070FF" />
          <stop offset="100%" stopColor="#3820B8" />
        </radialGradient>
        {/* Sphere: cyan */}
        <radialGradient id={`${id}-sc`} cx="38%" cy="32%" r="60%">
          <stop offset="0%"   stopColor="#60EEFF" />
          <stop offset="100%" stopColor="#00A0CC" />
        </radialGradient>
      </defs>

      {/* W ribbon */}
      <path
        d="M 14,16 L 33,68 L 50,28 L 67,68 L 86,16"
        stroke={`url(#${id}-ribbon)`}
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Nodes at key points */}
      {/* Left peak — large violet */}
      <circle cx="14" cy="16" r="11" fill={`url(#${id}-sv)`} />
      {/* Left valley */}
      <circle cx="33" cy="68" r="6.5" fill={`url(#${id}-sm)`} />
      {/* Center peak */}
      <circle cx="50" cy="28" r="8" fill={`url(#${id}-sm)`} />
      {/* Right valley */}
      <circle cx="67" cy="68" r="6.5" fill={`url(#${id}-sm)`} style={{ opacity: 0.85 }} />
      {/* Right peak — large cyan */}
      <circle cx="86" cy="16" r="11" fill={`url(#${id}-sc)`} />
    </svg>
  );
}

/* ── Logo variants ── */
export type LogoVariant = 'full' | 'horizontal' | 'mark';

interface WalletzLogoProps {
  variant?: LogoVariant;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  /** When collapsed (mark-only in sidebar) */
  collapsed?: boolean;
}

const MARK_SIZES: Record<NonNullable<WalletzLogoProps['size']>, number> = {
  sm: 24,
  md: 36,
  lg: 48,
  xl: 72,
};

/**
 * Full Walletz logo: Neural W mark + wordmark + Agent Studio.
 * Use `variant="mark"` (or `collapsed`) for icon-only.
 */
export function WalletzLogo({ variant = 'full', size = 'md', className, collapsed }: WalletzLogoProps) {
  const markPx = MARK_SIZES[size];
  const showMark = collapsed || variant === 'mark';

  if (showMark) {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <NeuralWMark size={markPx} />
      </div>
    );
  }

  if (variant === 'horizontal') {
    return (
      <div className={cn('flex items-center gap-2.5', className)}>
        <NeuralWMark size={markPx} />
        <div className="flex flex-col leading-none">
          <span
            className="font-display font-bold tracking-tight text-foreground"
            style={{ fontSize: markPx * 0.45 }}
          >
            Walletz
          </span>
          <span
            className="font-display font-semibold tracking-[0.12em] uppercase"
            style={{
              fontSize: markPx * 0.25,
              background: 'linear-gradient(90deg, #6D4AFF, #22D3EE)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Agent Studio
          </span>
        </div>
      </div>
    );
  }

  // variant === 'full' — stacked (centered)
  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <NeuralWMark size={markPx} />
      <div className="flex flex-col items-center leading-none gap-0.5">
        <span
          className="font-display font-bold tracking-tight text-foreground"
          style={{ fontSize: markPx * 0.5 }}
        >
          Walletz
        </span>
        <span
          className="font-display font-semibold tracking-[0.14em] uppercase"
          style={{
            fontSize: markPx * 0.26,
            background: 'linear-gradient(90deg, #6D4AFF, #22D3EE)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Agent Studio
        </span>
      </div>
    </div>
  );
}

/** Alias for the symbol-only mark */
export function WalletzMark({ size, className }: { size?: number; className?: string }) {
  return <NeuralWMark size={size ?? 36} className={className} />;
}
