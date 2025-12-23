'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    href: '/game',
    label: 'Study',
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 1.5 : 2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    href: '/game/profile',
    label: 'Profile',
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 1.5 : 2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    href: '/game/inventory',
    label: 'Items',
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 1.5 : 2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    href: '/game/crafting',
    label: 'Craft',
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 1.5 : 2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
      </svg>
    ),
  },
];

const moreMenuItems = [
  {
    href: '/game/quests',
    label: 'Quests',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: '/game/olympiads',
    label: 'Olympiads',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  {
    href: '/game/market',
    label: 'Market',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isMoreActive = moreMenuItems.some(item => pathname === item.href || pathname.startsWith(item.href + '/'));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    };

    if (moreOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [moreOpen]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass border-t border-[var(--border)] z-50 pb-safe">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full py-2 rounded-xl transition-all ${
                isActive
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] active:scale-95'
              }`}
            >
              <div className={`relative ${isActive ? 'scale-110' : ''} transition-transform`}>
                {item.icon(isActive)}
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--accent)]" />
                )}
              </div>
              <span className={`text-[10px] mt-1.5 font-medium tracking-wide ${isActive ? 'text-[var(--accent)]' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* More Menu */}
        <div className="relative flex-1 h-full" ref={menuRef}>
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={`flex flex-col items-center justify-center w-full h-full py-2 rounded-xl transition-all ${
              isMoreActive
                ? 'text-[var(--accent)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] active:scale-95'
            }`}
          >
            <div className={`relative ${isMoreActive ? 'scale-110' : ''} transition-transform`}>
              <svg className="w-6 h-6" fill={isMoreActive ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isMoreActive ? 1.5 : 2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {isMoreActive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--accent)]" />
              )}
            </div>
            <span className={`text-[10px] mt-1.5 font-medium tracking-wide ${isMoreActive ? 'text-[var(--accent)]' : ''}`}>
              More
            </span>
          </button>

          {/* Dropdown */}
          {moreOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-44 glass rounded-xl border border-[var(--border)] shadow-xl overflow-hidden animate-fade-in">
              {moreMenuItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 transition-all ${
                      isActive
                        ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                    }`}
                  >
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
