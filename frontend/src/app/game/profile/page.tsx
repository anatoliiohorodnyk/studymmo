'use client';

import { useCharacterStore } from '@/stores/characterStore';
import { SubjectCard } from '@/components/game/SubjectCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';

export default function ProfilePage() {
  const { character, isLoading } = useCharacterStore();

  if (isLoading || !character) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[var(--bg-card)]" />
          <div className="absolute inset-0 rounded-full border-4 border-t-[var(--accent)] animate-spin" />
        </div>
      </div>
    );
  }

  const subjectsByCategory: Record<string, typeof character.subjects> = {};
  for (const subject of character.subjects) {
    if (!subjectsByCategory[subject.category]) {
      subjectsByCategory[subject.category] = [];
    }
    subjectsByCategory[subject.category].push(subject);
  }

  const categoryLabels: Record<string, string> = {
    exact: 'Exact Sciences',
    natural: 'Natural Sciences',
    humanitarian: 'Humanities',
    physical: 'Physical',
    creative: 'Creative',
  };

  const categoryColors: Record<string, string> = {
    exact: 'text-blue-400',
    natural: 'text-[var(--success)]',
    humanitarian: 'text-purple-400',
    physical: 'text-[var(--danger)]',
    creative: 'text-[var(--accent)]',
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Player Stats Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Player Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Total Study Clicks */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--bg-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Total Study Clicks</p>
                <p className="text-lg font-bold text-[var(--text-primary)]">{parseInt(character.totalStudyClicks).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Energy Stats */}
          <div className="grid grid-cols-2 gap-3">
            {/* Quest Energy */}
            <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-xs text-[var(--text-muted)]">Quest Energy</span>
              </div>
              <p className="text-lg font-bold text-blue-400">{character.questEnergy} / {character.questEnergyMax}</p>
              <ProgressBar
                value={character.questEnergy}
                max={character.questEnergyMax}
                color="blue"
                size="sm"
              />
            </div>

            {/* Olympiad Energy */}
            <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <span className="text-xs text-[var(--text-muted)]">Olympiad</span>
              </div>
              <p className="text-lg font-bold text-amber-400">{character.olympiadEnergy} / {character.olympiadEnergyMax}</p>
              <ProgressBar
                value={character.olympiadEnergy}
                max={character.olympiadEnergyMax}
                color="yellow"
                size="sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subjects Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Your Subjects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(subjectsByCategory).map(([category, subjects]) => (
              <div key={category}>
                <h3 className={`text-sm font-semibold mb-2 ${categoryColors[category] || 'text-[var(--text-primary)]'}`}>
                  {categoryLabels[category] || category}
                </h3>
                <div className="space-y-2">
                  {subjects.map((subject) => (
                    <SubjectCard
                      key={subject.id}
                      name={subject.subjectName}
                      level={subject.level}
                      currentXp={subject.currentXp}
                      xpToNextLevel={subject.xpToNextLevel}
                      category={subject.category}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
