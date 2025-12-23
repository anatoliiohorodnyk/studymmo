'use client';

interface ProgressBarProps {
  value: number;
  max: number;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'accent';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animated?: boolean;
}

export function ProgressBar({
  value,
  max,
  color = 'blue',
  showLabel = false,
  size = 'md',
  className = '',
  animated = false,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const colorStyles = {
    blue: {
      bar: 'bg-gradient-to-r from-blue-500 to-blue-400',
      glow: 'shadow-[0_0_8px_rgba(59,130,246,0.5)]',
    },
    green: {
      bar: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
      glow: 'shadow-[0_0_8px_rgba(16,185,129,0.5)]',
    },
    yellow: {
      bar: 'bg-gradient-to-r from-yellow-500 to-yellow-400',
      glow: 'shadow-[0_0_8px_rgba(234,179,8,0.5)]',
    },
    red: {
      bar: 'bg-gradient-to-r from-red-500 to-red-400',
      glow: 'shadow-[0_0_8px_rgba(239,68,68,0.5)]',
    },
    purple: {
      bar: 'bg-gradient-to-r from-purple-500 to-purple-400',
      glow: 'shadow-[0_0_8px_rgba(168,85,247,0.5)]',
    },
    accent: {
      bar: 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)]',
      glow: 'shadow-[0_0_8px_var(--accent-glow)]',
    },
  };

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={className}>
      <div className={`w-full bg-[var(--bg-primary)] rounded-full ${sizes[size]} overflow-hidden border border-[var(--border)]`}>
        <div
          className={`${colorStyles[color].bar} ${sizes[size]} rounded-full transition-all duration-500 ease-out ${percentage > 10 ? colorStyles[color].glow : ''} ${animated ? 'animate-shimmer' : ''}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 text-xs text-[var(--text-muted)] text-right">
          {value.toLocaleString()} / {max.toLocaleString()}
        </div>
      )}
    </div>
  );
}
