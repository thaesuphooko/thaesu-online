import React from 'react';
import { cn } from '@/lib/utils';

export function Badge({ children, variant = 'default', className, ...props }) {
  const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors';
  const variants = {
    default: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
    outline: 'border border-input bg-transparent text-foreground',
  };
  return <span className={cn(base, variants[variant] || variants.default, className)} {...props}>{children}</span>;
}
