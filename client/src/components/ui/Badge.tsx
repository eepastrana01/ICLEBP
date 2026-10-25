import * as React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive' | 'info';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-slate-900 text-white border-transparent',
    secondary: 'bg-slate-100 text-slate-700 border-slate-200/70',
    outline: 'border-slate-200 text-slate-700 bg-white shadow-2xs',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-800 border-amber-200/80',
    destructive: 'bg-rose-50 text-rose-800 border-rose-200/80',
    info: 'bg-indigo-50 text-indigo-800 border-indigo-200/80'
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider transition-colors select-none',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
