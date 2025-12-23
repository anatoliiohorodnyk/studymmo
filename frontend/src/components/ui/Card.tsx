'use client';

import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'glow' | 'elevated';
  hover?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', variant = 'default', hover = false, children, ...props }, ref) => {
    const baseStyles = 'rounded-2xl p-4 transition-all duration-200';

    const variants = {
      default: 'bg-[var(--bg-card)] border border-[var(--border)] shadow-[var(--shadow-sm)]',
      bordered: 'bg-[var(--bg-card)] border-2 border-[var(--border-light)] shadow-[var(--shadow-md)]',
      glow: 'bg-[var(--bg-card)] border border-[var(--border-accent)] shadow-[var(--shadow-glow)]',
      elevated: 'bg-[var(--bg-elevated)] border border-[var(--border)] shadow-[var(--shadow-lg)]',
    };

    const hoverStyles = hover
      ? 'hover:translate-y-[-2px] hover:shadow-[var(--shadow-lg)] hover:border-[var(--border-light)] cursor-pointer'
      : '';

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${hoverStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className = '', children, ...props }, ref) => (
  <div
    ref={ref}
    className={`mb-4 pb-2 border-b border-[var(--border)] ${className}`}
    {...props}
  >
    {children}
  </div>
));

CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className = '', children, ...props }, ref) => (
  <h3
    ref={ref}
    className={`text-lg font-semibold text-[var(--text-primary)] ${className}`}
    {...props}
  >
    {children}
  </h3>
));

CardTitle.displayName = 'CardTitle';

export const CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className = '', children, ...props }, ref) => (
  <div ref={ref} className={className} {...props}>
    {children}
  </div>
));

CardContent.displayName = 'CardContent';
