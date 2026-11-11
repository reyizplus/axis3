import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

const variantStyles = {
  default: 'bg-secondary text-secondary-foreground',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  danger: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
};

export function StatusBadge({ label, variant = 'default', className }: StatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border',
      variantStyles[variant],
      className
    )}>
      {label}
    </span>
  );
}
