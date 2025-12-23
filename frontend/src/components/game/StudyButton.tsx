'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCharacterStore } from '@/stores/characterStore';
import { useDebugStore } from '@/stores/debugStore';

export function StudyButton() {
  const { study, cooldownUntil, lastStudyResult } = useCharacterStore();
  const { cooldownDisabled } = useDebugStore();
  const [isStudying, setIsStudying] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      // If debug cooldown is disabled, always show 0
      const left = cooldownDisabled ? 0 : Math.max(0, cooldownUntil - Date.now());
      setCooldownLeft(left);
    }, 100);
    return () => clearInterval(timer);
  }, [cooldownUntil, cooldownDisabled]);

  const handleStudy = useCallback(async () => {
    if (isStudying || (!cooldownDisabled && cooldownLeft > 0)) return;

    setIsStudying(true);
    try {
      await study();
      setShowResult(true);
      setTimeout(() => setShowResult(false), 2500);
    } catch (err) {
      console.error('Study failed:', err);
    } finally {
      setIsStudying(false);
    }
  }, [study, isStudying, cooldownLeft, cooldownDisabled]);

  const isDisabled = isStudying || (!cooldownDisabled && cooldownLeft > 0);
  const cooldownSeconds = (cooldownLeft / 1000).toFixed(1);

  return (
    <>
      {/* Floating Result Toast */}
      {showResult && lastStudyResult && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
          <div className="glass rounded-xl border border-[var(--border)] shadow-lg px-4 py-2 flex items-center gap-3 min-w-[200px]">
            {/* Character XP */}
            <div className="flex items-center gap-1.5 text-[var(--accent)]">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
              </svg>
              <span className="font-bold">+{lastStudyResult.characterXpGained}</span>
            </div>

            {/* Divider */}
            <div className="w-px h-4 bg-[var(--border)]" />

            {/* Subject XP gains (compact) */}
            <div className="flex items-center gap-2 text-sm">
              {lastStudyResult.subjectXpGains.slice(0, 3).map((gain, i) => (
                <span key={gain.subjectId} className="text-[var(--text-secondary)]">
                  {gain.subjectName.slice(0, 3)}
                  <span className="text-[var(--text-primary)] ml-0.5">+{gain.xpGained}</span>
                  {gain.leveledUp && <span className="text-purple-400 ml-0.5">!</span>}
                </span>
              ))}
            </div>

            {/* Cash if earned */}
            {lastStudyResult.cashGained > 0 && (
              <>
                <div className="w-px h-4 bg-[var(--border)]" />
                <span className="text-[var(--success)] font-medium text-sm">
                  +${lastStudyResult.cashGained}
                </span>
              </>
            )}

            {/* Grade badge */}
            {lastStudyResult.grade && (
              <>
                <div className="w-px h-4 bg-[var(--border)]" />
                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs font-bold">
                  {lastStudyResult.grade.displayGrade}
                </span>
              </>
            )}

            {/* Material drop */}
            {lastStudyResult.materialDrop && (
              <>
                <div className="w-px h-4 bg-[var(--border)]" />
                <span className="text-[var(--success)] text-xs">
                  +{lastStudyResult.materialDrop.materialName}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Study Button */}
      <div className="relative">
        {/* Outer glow ring */}
        {!isDisabled && (
          <div className="absolute inset-0 rounded-full bg-[var(--accent)] opacity-20 blur-xl animate-pulse" />
        )}

        {/* Button container with rings */}
        <div className="relative">
          {/* Decorative ring */}
          <div className={`absolute inset-[-8px] rounded-full border-2 ${isDisabled ? 'border-[var(--border)]' : 'border-[var(--accent)]/30'} transition-colors`} />

          <button
            onClick={handleStudy}
            disabled={isDisabled}
            className={`
              relative w-32 h-32 rounded-full text-xl font-bold
              transition-all duration-300 transform
              ${
                isDisabled
                  ? 'bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-secondary)] border-2 border-[var(--border)] text-[var(--text-muted)] cursor-not-allowed'
                  : 'bg-gradient-to-br from-[var(--accent)] via-[var(--accent)] to-[var(--accent-hover)] hover:scale-105 active:scale-95 shadow-[0_0_40px_var(--accent-glow)] hover:shadow-[0_0_60px_var(--accent-glow)] text-[var(--bg-primary)]'
              }
            `}
          >
            {isStudying ? (
              <div className="flex items-center justify-center">
                <div className="w-6 h-6 border-3 border-[var(--bg-primary)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : cooldownLeft > 0 ? (
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-[var(--text-secondary)]">{cooldownSeconds}</span>
                <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">sec</span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <svg className="w-8 h-8 mb-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0z" />
                </svg>
                <span className="text-sm font-bold tracking-wider">STUDY</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
