'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  Store,
  Tag,
  Package,
  Users,
  FileText,
  MessageSquare,
  Truck,
  Boxes,
  HardDrive,
  BarChart3,
  Shield,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  ShoppingCart,
  Store,
  Tag,
  Package,
  Users,
  FileText,
  MessageSquare,
  Truck,
  Boxes,
  HardDrive,
  BarChart3,
  Shield,
};

interface QuickActionCardProps {
  title: string;
  href: string;
  icon: string;
  color: string;
  bg: string;
}

export function QuickActionCard({ title, href, icon: iconName, color, bg }: QuickActionCardProps) {
  const Icon = iconMap[iconName];

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Link
        href={href}
        className="group flex flex-col items-center gap-2 p-4 rounded-2xl border border-border/50 bg-card hover:shadow-md hover:border-border/80 transition-all duration-200"
      >
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} group-hover:scale-110 transition-transform duration-200`}>
          {Icon && <Icon className={`h-5 w-5 ${color}`} />}
        </div>
        <span className="text-xs font-medium text-muted-foreground text-center leading-tight">
          {title}
        </span>
      </Link>
    </motion.div>
  );
}
