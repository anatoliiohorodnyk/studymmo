'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`w-full px-3 py-2 bg-[var(--bg-card)] border rounded-lg transition-colors text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent ${
            error
              ? 'border-[var(--danger)] focus:ring-[var(--danger)]'
              : 'border-[var(--border)]'
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-[var(--danger)]">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
