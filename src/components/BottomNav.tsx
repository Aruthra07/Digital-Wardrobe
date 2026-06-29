'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Shirt, Sparkles, Calendar, User } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'My Closet', path: '/wardrobe', icon: Shirt },
    { name: 'Builder', path: '/build', icon: Sparkles },
    { name: 'Calendar', path: '/calendar', icon: Calendar },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <>
      {/* Desktop Header */}
      <header className="hidden md:flex items-center justify-between px-8 py-4 sticky top-0 z-50 glass-navbar shadow-sm">
        <div className="flex items-center gap-2">
          <motion.div 
            initial={{ rotate: -10 }}
            animate={{ rotate: 10 }}
            transition={{ repeat: Infinity, repeatType: 'reverse', duration: 3, ease: 'easeInOut' }}
            className="text-2xl"
          >
            👗
          </motion.div>
          <span className="font-playfair text-xl font-bold tracking-wide bg-gradient-to-r from-lavender via-softpink to-pastel-blue bg-clip-text text-transparent">
            Closet Canvas
          </span>
        </div>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link key={item.path} href={item.path} className="relative px-4 py-2 rounded-full text-sm font-medium transition-colors">
                <span className={`relative z-10 flex items-center gap-2 ${isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-800'}`}>
                  <item.icon size={16} />
                  {item.name}
                </span>
                {isActive && (
                  <motion.span
                    layoutId="desktop-active-nav"
                    className="absolute inset-0 bg-white/80 rounded-full shadow-xs border border-white/50"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Mobile-First Bottom Nav (Always visible on mobile, hidden on desktop) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-t border-white/40 px-2 py-2 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
        <nav className="max-w-md mx-auto flex justify-around items-center">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            return (
              <Link 
                key={item.path} 
                href={item.path} 
                className="relative py-2 px-3 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 flex-1"
              >
                <span className={`relative z-10 ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                  <Icon size={20} className={isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'} />
                </span>
                {isActive && (
                  <motion.span
                    layoutId="mobile-active-nav"
                    className="absolute inset-0 bg-gradient-to-tr from-lavender/30 to-softpink/30 rounded-2xl border border-white/40"
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  />
                )}
                <span className={`text-[9px] mt-1 relative z-10 font-semibold ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
