'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';

    const variants = {
      primary:
        'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] text-[var(--bg-primary)] hover:shadow-[0_0_20px_var(--accent-glow)] focus:ring-[var(--accent)] shadow-lg shadow-[var(--accent)]/30',
      secondary:
        'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-light)] focus:ring-[var(--border-light)] shadow-[var(--shadow-sm)]',
      danger:
        'bg-gradient-to-r from-[var(--danger)] to-red-500 text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] focus:ring-[var(--danger)] shadow-lg shadow-red-500/30',
      ghost:
        'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] focus:ring-[var(--border)]',
      accent:
        'bg-transparent border-2 border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)]/10 focus:ring-[var(--accent)]',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-5 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <div className="relative w-5 h-5 mr-2">
            <div className="absolute inset-0 rounded-full border-2 border-current opacity-25" />
            <div className="absolute inset-0 rounded-full border-2 border-t-current border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          </div>
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
