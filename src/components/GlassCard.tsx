'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  delay?: number;
  onClick?: () => void;
}

export default function GlassCard({ children, className = '', hoverable = false, delay = 0, onClick }: GlassCardProps) {
  const classes = `glass-card rounded-2xl p-6 ${
    hoverable ? 'glass-card-hover cursor-pointer' : ''
  } ${className}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={classes}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

