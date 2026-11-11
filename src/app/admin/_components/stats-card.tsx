'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Calculator,
  DollarSign,
  Package,
  HardDrive,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Calculator,
  DollarSign,
  Package,
  HardDrive,
};

interface StatsCardProps {
  title: string;
  value: string;
  icon: string;
  trend: string;
  trendUp: boolean;
  gradient: string;
  iconColor: string;
}

export function StatsCard({ title, value, icon: iconName, trend, trendUp, gradient, iconColor }: StatsCardProps) {
  const Icon = iconMap[iconName];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 hover:shadow-md hover:border-border/80 transition-all duration-300"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconColor} transition-transform group-hover:scale-110 duration-300`}>
            {Icon && <Icon className="h-4 w-4" />}
          </div>
        </div>
        <div className="text-2xl font-bold tracking-tight mb-1">{value}</div>
        <span className={cn(
          'text-[11px] font-medium',
          trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
        )}>
          {trend}
        </span>
      </div>
    </motion.div>
  );
}
