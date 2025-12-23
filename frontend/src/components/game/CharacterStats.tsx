'use client';

import { useCharacterStore } from '@/stores/characterStore';
import { Card, CardContent } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';

export function CharacterStats() {
  const { character } = useCharacterStore();

  if (!character) return null;

  const xpPercent = Math.round((parseInt(character.totalXp) / character.xpToNextLevel) * 100);

  return (
    <Card>
      <CardContent>
        {/* Compact Level & XP Header */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center shadow-[var(--shadow-glow)]">
              <span className="text-xl font-bold text-[var(--bg-primary)]">{character.level}</span>
            </div>
            <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-[var(--bg-card)] border border-[var(--border)] text-[10px] font-medium text-[var(--text-secondary)]">
              LVL
            </div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="font-bold text-[var(--text-primary)]">{character.username}</span>
              <span className="text-xs text-[var(--accent)]">{xpPercent}%</span>
            </div>
            <ProgressBar
              value={parseInt(character.totalXp)}
              max={character.xpToNextLevel}
              color="accent"
              size="md"
            />
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-xs text-[var(--text-muted)]">
                {parseInt(character.totalXp).toLocaleString()} / {character.xpToNextLevel.toLocaleString()} XP
              </p>
              {character.currentClass && (
                <p className="text-xs text-[var(--text-secondary)]">
                  <span className="text-[var(--text-muted)]">{character.currentLocation.name}</span>
                  {' · '}
                  <span className="text-[var(--accent)] font-medium">Grade {character.currentClass.gradeNumber}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
