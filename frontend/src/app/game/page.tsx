'use client';

import { useState, useEffect } from 'react';
import { useCharacterStore } from '@/stores/characterStore';
import { CharacterStats } from '@/components/game/CharacterStats';
import { StudyButton } from '@/components/game/StudyButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { api } from '@/lib/api';

type SpecializationsData = Awaited<ReturnType<typeof api.getSpecializations>>;
type DailyRewardStatus = Awaited<ReturnType<typeof api.getDailyRewardStatus>>;
type ClaimResult = Awaited<ReturnType<typeof api.claimDailyReward>>;

export default function GamePage() {
  const { character, isLoading, refreshCharacter } = useCharacterStore();
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [specializations, setSpecializations] = useState<SpecializationsData | null>(null);
  const [isLoadingSpecs, setIsLoadingSpecs] = useState(false);
  const [isSelecting, setIsSelecting] = useState<string | null>(null);
  const [selectResult, setSelectResult] = useState<{ name: string } | null>(null);

  // Daily Rewards state
  const [dailyRewardStatus, setDailyRewardStatus] = useState<DailyRewardStatus | null>(null);
  const [showDailyRewardModal, setShowDailyRewardModal] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);

  // Load daily reward status on mount
  useEffect(() => {
    api.getDailyRewardStatus()
      .then(setDailyRewardStatus)
      .catch(console.error);
  }, []);

  // Load specializations when at College without one
  useEffect(() => {
    if (
      character &&
      character.currentLocation.type === 'college' &&
      !character.currentSpecialization
    ) {
      setIsLoadingSpecs(true);
      api.getSpecializations()
        .then(setSpecializations)
        .catch(console.error)
        .finally(() => setIsLoadingSpecs(false));
    }
  }, [character?.currentLocation.type, character?.currentSpecialization]);

  const handleClaimDailyReward = async () => {
    setIsClaiming(true);
    try {
      const result = await api.claimDailyReward();
      setClaimResult(result);
      // Update status after claiming
      const newStatus = await api.getDailyRewardStatus();
      setDailyRewardStatus(newStatus);
      await refreshCharacter();
    } catch (err) {
      console.error('Failed to claim daily reward:', err);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleSelectSpecialization = async (specId: string) => {
    setIsSelecting(specId);
    try {
      const result = await api.selectSpecialization(specId);
      setSelectResult({ name: result.specialization.name });
      await refreshCharacter();
      setTimeout(() => setSelectResult(null), 3000);
    } catch (err) {
      console.error('Failed to select specialization:', err);
    } finally {
      setIsSelecting(null);
    }
  };

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

  const clicksUntilNextGrade = 10 - (character.studyClicksInCurrentClass % 10);
  const gradeProgress = character.studyClicksInCurrentClass % 10;
  const nextClass = character.nextClass;
  const nextLocation = character.nextLocation;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Daily Reward Button */}
      {dailyRewardStatus?.canClaim && (
        <button
          onClick={() => setShowDailyRewardModal(true)}
          className="w-full p-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg flex items-center justify-center gap-2 text-white font-semibold animate-pulse"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 5a2 2 0 012-2h6a2 2 0 012 2v2a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" />
            <path fillRule="evenodd" d="M3 8a2 2 0 012-2h10a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
          Claim Daily Reward!
        </button>
      )}

      <CharacterStats />

      {/* Study Section */}
      <Card variant="glow">
        <CardContent className="py-6">
          {/* Study Button */}
          <div className="flex justify-center mb-6">
            <StudyButton />
          </div>

          {/* Next Grade Progress */}
          <div className="max-w-xs mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--text-secondary)]">Next Grade</span>
              <span className="text-sm font-bold text-[var(--accent)]">{clicksUntilNextGrade} clicks</span>
            </div>
            <ProgressBar
              value={gradeProgress}
              max={10}
              color="accent"
              size="md"
            />
          </div>
        </CardContent>
      </Card>

      {/* Next Class Requirements (within same location) */}
      {nextClass && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Advance to Grade {nextClass.gradeNumber}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-xs text-[var(--text-muted)]">
                Collect required grades in each subject to advance
              </p>

              {/* Subject Grade Requirements */}
              {[...nextClass.requirements.subjects].sort((a, b) => a.subjectName.localeCompare(b.subjectName)).map((req) => {
                const progress = Math.min(100, (req.gradesCollected / req.gradesRequired) * 100);

                return (
                  <div key={req.subjectId} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-primary)]">{req.subjectName}</span>
                      <span className={`text-xs font-medium ${req.met ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
                        {req.gradesCollected}/{req.gradesRequired}
                        {req.met && (
                          <svg className="w-3.5 h-3.5 inline ml-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                    </div>
                    <ProgressBar
                      value={req.gradesCollected}
                      max={req.gradesRequired}
                      color={req.met ? 'green' : 'blue'}
                      size="sm"
                    />
                  </div>
                );
              })}

              {/* Advance to Next Class Button */}
              {nextClass.canAdvance && (
                <div className="pt-3 mt-2 border-t border-[var(--border)]">
                  <button
                    onClick={async () => {
                      setIsAdvancing(true);
                      try {
                        await api.completeClass();
                        await refreshCharacter();
                      } catch (err) {
                        console.error('Failed to advance:', err);
                      }
                      setIsAdvancing(false);
                    }}
                    disabled={isAdvancing}
                    className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg disabled:opacity-50"
                  >
                    {isAdvancing ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Advancing...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Advance to Grade {nextClass.gradeNumber}
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Location Requirements - only show when all classes completed */}
      {!nextClass && nextLocation && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              Transition to {nextLocation.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Subject Requirements */}
              {nextLocation.requirements.subjectLevels?.map((req) => {
                const levelMet = req.currentLevel >= req.minLevel;
                const gradesMet = req.gradesCollected >= req.gradesRequired;
                const conditionsMet = (levelMet ? 1 : 0) + (gradesMet ? 1 : 0);
                const totalConditions = req.gradesRequired > 0 ? 2 : 1;

                return (
                  <div key={req.subjectId} className="space-y-2">
                    {/* Subject Name with conditions count */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {req.subjectName}
                      </span>
                      <span className={`text-xs font-medium ${conditionsMet === totalConditions ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
                        {conditionsMet}/{totalConditions}
                        {conditionsMet === totalConditions && (
                          <svg className="w-3.5 h-3.5 inline ml-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                    </div>

                    {/* Level requirement */}
                    <div className="ml-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${levelMet ? 'bg-[var(--success)]' : 'bg-[var(--text-muted)]'}`} />
                        <span className="text-xs text-[var(--text-secondary)]">Level</span>
                      </div>
                      <span className={`text-xs ${levelMet ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
                        {req.currentLevel}/{req.minLevel}
                      </span>
                    </div>

                    {/* Grades requirement */}
                    {req.gradesRequired > 0 && (
                      <div className="ml-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${gradesMet ? 'bg-[var(--success)]' : 'bg-[var(--text-muted)]'}`} />
                          <span className="text-xs text-[var(--text-secondary)]">Grades</span>
                        </div>
                        <span className={`text-xs ${gradesMet ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
                          {req.gradesCollected}/{req.gradesRequired}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Location Progress Requirement */}
              {nextLocation.requirements.locationPercent && (
                <div className="pt-2 border-t border-[var(--border)]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${nextLocation.requirements.locationPercent.met ? 'bg-[var(--success)]' : 'bg-[var(--text-muted)]'}`} />
                      <span className="text-sm text-[var(--text-secondary)]">
                        {character.currentLocation.name} Progress
                      </span>
                    </div>
                    <span className={`text-sm font-medium ${nextLocation.requirements.locationPercent.met ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
                      {nextLocation.requirements.locationPercent.current}%
                    </span>
                  </div>
                  <ProgressBar
                    value={nextLocation.requirements.locationPercent.current}
                    max={nextLocation.requirements.locationPercent.percent}
                    color={nextLocation.requirements.locationPercent.met ? 'green' : 'purple'}
                    size="sm"
                  />
                </div>
              )}

              {/* Advance Button */}
              {nextLocation.canUnlock && (
                <div className="pt-3 mt-3 border-t border-[var(--border)]">
                  <button
                    onClick={async () => {
                      setIsAdvancing(true);
                      try {
                        await api.advanceToNextLocation();
                        await refreshCharacter();
                      } catch (err) {
                        console.error('Failed to advance:', err);
                      }
                      setIsAdvancing(false);
                    }}
                    disabled={isAdvancing}
                    className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg disabled:opacity-50"
                  >
                    {isAdvancing ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Advancing...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Advance to {nextLocation.name}
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Specialization Selection Toast */}
      {selectResult && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
          <div className="glass rounded-xl border border-[var(--success)]/30 shadow-lg px-4 py-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--success)]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-[var(--success)] font-medium">
              Enrolled in {selectResult.name}!
            </span>
          </div>
        </div>
      )}

      {/* College Specialization Selection */}
      {character.currentLocation.type === 'college' && !character.currentSpecialization && (
        <Card className="border-[var(--accent)]/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
              Choose Your Specialization
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSpecs ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : specializations ? (
              <div className="space-y-4">
                <p className="text-xs text-[var(--text-muted)]">
                  Your grade average: <span className="font-medium text-[var(--text-primary)]">{specializations.gradeAverage}%</span>
                </p>

                {specializations.specializations.map((spec) => (
                  <div
                    key={spec.id}
                    className={`p-4 rounded-xl border transition-all ${
                      spec.canUnlock
                        ? 'border-[var(--accent)]/30 bg-[var(--accent)]/5 hover:border-[var(--accent)]/50'
                        : 'border-[var(--border)] bg-[var(--bg-secondary)] opacity-70'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-[var(--text-primary)]">{spec.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        spec.canUnlock
                          ? 'bg-[var(--success)]/20 text-[var(--success)]'
                          : 'bg-[var(--bg-card)] text-[var(--text-muted)]'
                      }`}>
                        ${spec.requirements.unlockCost}
                      </span>
                    </div>

                    {/* Subject Requirements */}
                    <div className="space-y-1.5 mb-3">
                      {spec.requirements.subjects.map((subj) => (
                        <div key={subj.subjectId} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${subj.met ? 'bg-[var(--success)]' : 'bg-[var(--text-muted)]'}`} />
                            <span className="text-[var(--text-secondary)]">{subj.subjectName}</span>
                          </div>
                          <span className={subj.met ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}>
                            Lv.{subj.currentLevel}/{subj.requiredLevel}
                          </span>
                        </div>
                      ))}

                      {/* Grade Average Requirement */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${spec.requirements.gradeAverageMet ? 'bg-[var(--success)]' : 'bg-[var(--text-muted)]'}`} />
                          <span className="text-[var(--text-secondary)]">Grade Average</span>
                        </div>
                        <span className={spec.requirements.gradeAverageMet ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}>
                          {specializations.gradeAverage}%/{spec.requirements.minGradeAverage}%
                        </span>
                      </div>

                      {/* Cost Requirement */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${spec.requirements.costMet ? 'bg-[var(--success)]' : 'bg-[var(--text-muted)]'}`} />
                          <span className="text-[var(--text-secondary)]">Cost</span>
                        </div>
                        <span className={spec.requirements.costMet ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}>
                          ${specializations.cash}/${spec.requirements.unlockCost}
                        </span>
                      </div>
                    </div>

                    {/* Enroll Button */}
                    <button
                      onClick={() => handleSelectSpecialization(spec.id)}
                      disabled={!spec.canUnlock || isSelecting === spec.id}
                      className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                        spec.canUnlock
                          ? 'bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)]'
                          : 'bg-[var(--bg-card)] text-[var(--text-muted)] cursor-not-allowed'
                      }`}
                    >
                      {isSelecting === spec.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Enrolling...
                        </span>
                      ) : spec.canUnlock ? (
                        `Enroll for $${spec.requirements.unlockCost}`
                      ) : (
                        'Requirements not met'
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-[var(--text-muted)] py-4">
                Failed to load specializations
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Current Specialization Display */}
      {character.currentSpecialization && (
        <Card className="border-[var(--success)]/30 bg-[var(--success)]/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--success)]/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Your Specialization</p>
                <p className="font-semibold text-[var(--text-primary)]">{character.currentSpecialization.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Reward Modal */}
      {showDailyRewardModal && dailyRewardStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <div className="glass rounded-2xl border border-[var(--border)] shadow-2xl w-full max-w-md animate-slide-up">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Daily Rewards</h2>
                <button
                  onClick={() => {
                    setShowDailyRewardModal(false);
                    setClaimResult(null);
                  }}
                  className="p-1 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Claim Result */}
              {claimResult && (
                <div className="mb-6 p-4 rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/30">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-[var(--success)]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold text-[var(--success)]">Day {claimResult.claimedDay} Claimed!</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    {claimResult.rewards.cash > 0 && (
                      <p className="text-[var(--text-primary)]">+${claimResult.rewards.cash} Cash</p>
                    )}
                    {claimResult.rewards.questEnergy > 0 && (
                      <p className="text-[var(--text-primary)]">+{claimResult.rewards.questEnergy} Quest Energy</p>
                    )}
                    {claimResult.rewards.item && (
                      <p className="text-[var(--text-primary)]">
                        +1 <span className={`font-medium ${
                          claimResult.rewards.item.rarity === 'rare' ? 'text-blue-400' :
                          claimResult.rewards.item.rarity === 'uncommon' ? 'text-green-400' :
                          'text-gray-400'
                        }`}>{claimResult.rewards.item.name}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* 7-Day Grid */}
              <div className="grid grid-cols-7 gap-2 mb-6">
                {dailyRewardStatus.allRewards.map((reward) => (
                  <div
                    key={reward.day}
                    className={`relative p-2 rounded-lg text-center transition-all ${
                      reward.isCurrent && dailyRewardStatus.canClaim
                        ? 'bg-gradient-to-b from-amber-500/20 to-orange-500/20 border-2 border-amber-500 ring-2 ring-amber-500/30'
                        : reward.isClaimed || (reward.isCurrent && !dailyRewardStatus.canClaim)
                        ? 'bg-[var(--bg-secondary)] border border-[var(--success)]/50'
                        : 'bg-[var(--bg-card)] border border-[var(--border)]'
                    }`}
                  >
                    <p className={`text-xs font-medium mb-1 ${
                      reward.isCurrent && dailyRewardStatus.canClaim
                        ? 'text-amber-400'
                        : 'text-[var(--text-muted)]'
                    }`}>
                      D{reward.day}
                    </p>
                    <div className="text-xs">
                      {reward.cash > 0 && (
                        <p className="text-[var(--text-primary)] font-medium">${reward.cash}</p>
                      )}
                      {reward.itemRarity && (
                        <p className={`font-medium ${
                          reward.itemRarity === 'rare' ? 'text-blue-400' :
                          reward.itemRarity === 'uncommon' ? 'text-green-400' :
                          'text-gray-400'
                        }`}>
                          {reward.itemRarity.charAt(0).toUpperCase()}
                        </p>
                      )}
                      {reward.questEnergy && (
                        <p className="text-purple-400">+{reward.questEnergy}E</p>
                      )}
                    </div>
                    {(reward.isClaimed || (reward.isCurrent && !dailyRewardStatus.canClaim)) && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--success)] rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Today's Reward Detail */}
              {dailyRewardStatus.todayReward && dailyRewardStatus.canClaim && !claimResult && (
                <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30">
                  <p className="text-xs text-[var(--text-muted)] mb-2">Today&apos;s Reward (Day {dailyRewardStatus.todayReward.day})</p>
                  <div className="space-y-1">
                    {dailyRewardStatus.todayReward.cash > 0 && (
                      <p className="text-lg font-bold text-amber-400">${dailyRewardStatus.todayReward.cash}</p>
                    )}
                    {dailyRewardStatus.todayReward.itemRarity && (
                      <p className={`text-lg font-bold ${
                        dailyRewardStatus.todayReward.itemRarity === 'rare' ? 'text-blue-400' :
                        dailyRewardStatus.todayReward.itemRarity === 'uncommon' ? 'text-green-400' :
                        'text-gray-400'
                      }`}>
                        Random {dailyRewardStatus.todayReward.itemRarity.charAt(0).toUpperCase() + dailyRewardStatus.todayReward.itemRarity.slice(1)} Item
                      </p>
                    )}
                    {dailyRewardStatus.todayReward.questEnergy && (
                      <p className="text-lg font-bold text-purple-400">+{dailyRewardStatus.todayReward.questEnergy} Quest Energy</p>
                    )}
                  </div>
                </div>
              )}

              {/* Claim Button */}
              {dailyRewardStatus.canClaim && !claimResult && (
                <button
                  onClick={handleClaimDailyReward}
                  disabled={isClaiming}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg disabled:opacity-50"
                >
                  {isClaiming ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Claiming...
                    </span>
                  ) : (
                    'Claim Reward'
                  )}
                </button>
              )}

              {/* Already Claimed or Close */}
              {(!dailyRewardStatus.canClaim || claimResult) && (
                <button
                  onClick={() => {
                    setShowDailyRewardModal(false);
                    setClaimResult(null);
                  }}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-[var(--text-primary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-card)] transition-all"
                >
                  {claimResult ? 'Close' : 'Come Back Tomorrow'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
