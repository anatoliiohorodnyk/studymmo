'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useCharacterStore } from '@/stores/characterStore';
import { GlobalChat } from '@/components/game/GlobalChat';

export function Header() {
  const { logout } = useAuthStore();
  const { character } = useCharacterStore();
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 glass border-b border-[var(--border)]">
        <div className="flex items-center justify-between px-4 h-16 max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center shadow-[var(--shadow-glow)]">
              <span className="text-lg font-bold text-[var(--bg-primary)]">S</span>
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text">StudyMMO</h1>
              {character && (
                <p className="text-xs text-[var(--text-muted)]">{character.currentLocation.name}</p>
              )}
            </div>
          </div>

          {character && (
            <div className="flex items-center gap-2">
              {/* Chat Button */}
              <button
                onClick={() => setIsChatOpen(true)}
                className="p-2.5 rounded-xl text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all relative"
                title="Global Chat"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                </svg>
              </button>

              <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                  <span className="text-sm font-bold text-[var(--accent)]">Lv.{character.level}</span>
                </div>
                <div className="w-px h-4 bg-[var(--border)]" />
                <div className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-[var(--success)]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-semibold text-[var(--success)]">{character.cash}</span>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-all"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Global Chat Modal */}
      <GlobalChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  );
}
