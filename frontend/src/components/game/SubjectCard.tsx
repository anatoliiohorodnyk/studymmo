'use client';

import { ProgressBar } from '@/components/ui/ProgressBar';

interface SubjectCardProps {
  name: string;
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  category: string;
}

const categoryColors: Record<string, string> = {
  exact: 'bg-blue-500/20 text-blue-400',
  natural: 'bg-[var(--success)]/20 text-[var(--success)]',
  humanitarian: 'bg-purple-500/20 text-purple-400',
  physical: 'bg-[var(--danger)]/20 text-[var(--danger)]',
  creative: 'bg-[var(--accent)]/20 text-[var(--accent)]',
};

const categoryProgressColors: Record<
  string,
  'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'accent'
> = {
  exact: 'blue',
  natural: 'green',
  humanitarian: 'purple',
  physical: 'red',
  creative: 'accent',
};

export function SubjectCard({
  name,
  level,
  currentXp,
  xpToNextLevel,
  category,
}: SubjectCardProps) {
  return (
    <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border)] hover:border-[var(--border-light)] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[var(--text-primary)]">{name}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs ${categoryColors[category] || 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'}`}
          >
            {category}
          </span>
        </div>
        <span className="text-sm font-bold text-[var(--accent)]">Lv.{level}</span>
      </div>
      <ProgressBar
        value={currentXp}
        max={xpToNextLevel}
        color={categoryProgressColors[category] || 'blue'}
        size="sm"
      />
      <p className="text-xs text-[var(--text-muted)] mt-1 text-right">
        {currentXp.toLocaleString()} / {xpToNextLevel.toLocaleString()} XP
      </p>
    </div>
  );
}
