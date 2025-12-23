'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { CircularProgress } from '@/components/ui/CircularProgress';
import { api } from '@/lib/api';
import { useCharacterStore } from '@/stores/characterStore';

interface Quest {
  id: string;
  name: string;
  description: string;
  type: string;
  energyCost: number;
  cooldownSeconds: number;
  rewards: {
    cashMin: number;
    cashMax: number;
    subjectXpMin: number;
    subjectXpMax: number;
    itemChance: number;
  };
  requiredCharacterLevel: number;
  requiredSubjectLevel: number;
  isOnCooldown: boolean;
  cooldownUntil: string | null;
  canStart: boolean;
  meetsRequirements: boolean;
}

interface QuestResult {
  success: boolean;
  questName: string;
  cashEarned: number;
  subjectXpGained: {
    subjectName: string;
    xpGained: number;
    newLevel: number;
    leveledUp: boolean;
  };
  itemDrop: { itemName: string; rarity: string } | null;
  newEnergy: number;
  cooldownUntil: string;
}

interface CooldownInfo {
  endTime: number;
  totalSeconds: number;
  result?: QuestResult;
}

interface Olympiad {
  id: string;
  name: string;
  difficulty: string;
  subject: { id: string; name: string } | null;
  energyCost: number;
  requiredLevel: number;
  isUnlocked: boolean;
  canAfford: boolean;
  rewards: {
    cash_min: number;
    cash_max: number;
    xp_min: number;
    xp_max: number;
    item_chance: number;
  };
}

interface BattleResult {
  won: boolean;
  playerScore: number;
  npcScore: number;
  npcLevel: number;
  rewards: {
    cash: number;
    xp: number;
    itemDrop?: {
      itemId: string;
      itemName: string;
      rarity: string;
    };
  } | null;
}

export default function QuestsPage() {
  const { refreshCharacter } = useCharacterStore();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [currentEnergy, setCurrentEnergy] = useState(0);
  const [maxEnergy, setMaxEnergy] = useState(100);
  const [energyRegenMinutes, setEnergyRegenMinutes] = useState(3);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState<string | null>(null);
  const [cooldowns, setCooldowns] = useState<Record<string, CooldownInfo>>({});
  const [, forceUpdate] = useState(0);

  // Olympiad state
  const [olympiads, setOlympiads] = useState<Olympiad[]>([]);
  const [olympiadEnergy, setOlympiadEnergy] = useState(0);
  const [olympiadEnergyMax, setOlympiadEnergyMax] = useState(50);
  const [isBattling, setIsBattling] = useState<string | null>(null);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [showBattleResult, setShowBattleResult] = useState(false);

  const loadQuests = useCallback(async () => {
    try {
      const data = await api.getQuests();
      setQuests(data.quests);
      setCurrentEnergy(data.currentEnergy);
      setMaxEnergy(data.maxEnergy);
      setEnergyRegenMinutes(data.energyRegenMinutes);

      const newCooldowns: Record<string, CooldownInfo> = {};
      for (const quest of data.quests) {
        if (quest.cooldownUntil) {
          newCooldowns[quest.id] = {
            endTime: new Date(quest.cooldownUntil).getTime(),
            totalSeconds: quest.cooldownSeconds,
          };
        }
      }
      setCooldowns(newCooldowns);
    } catch (error) {
      console.error('Failed to load quests:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadOlympiads = useCallback(async () => {
    try {
      const data = await api.getOlympiads();
      setOlympiads(data.olympiads);
      setOlympiadEnergy(data.olympiadEnergy);
      setOlympiadEnergyMax(data.olympiadEnergyMax);
    } catch (error) {
      console.error('Failed to load olympiads:', error);
    }
  }, []);

  useEffect(() => {
    loadQuests();
    loadOlympiads();
  }, [loadQuests, loadOlympiads]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      let shouldUpdate = false;

      setCooldowns((prev) => {
        const updated = { ...prev };
        for (const [questId, info] of Object.entries(updated)) {
          if (info.endTime <= now) {
            delete updated[questId];
            shouldUpdate = true;
          }
        }
        return shouldUpdate ? updated : prev;
      });

      forceUpdate((n) => n + 1);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const handleStartQuest = async (questId: string) => {
    const quest = quests.find((q) => q.id === questId);
    if (!quest) return;

    setIsStarting(questId);

    try {
      const result = await api.startQuest(questId);
      setCurrentEnergy(result.newEnergy);
      setCooldowns((prev) => ({
        ...prev,
        [questId]: {
          endTime: new Date(result.cooldownUntil).getTime(),
          totalSeconds: quest.cooldownSeconds,
          result,
        },
      }));
      await refreshCharacter();
    } catch (error: any) {
      console.error('Failed to start quest:', error);
      alert(error.message || 'Failed to start quest');
    } finally {
      setIsStarting(null);
    }
  };

  const getCooldownProgress = (info: CooldownInfo) => {
    const now = Date.now();
    const remaining = Math.max(0, info.endTime - now);
    const elapsed = info.totalSeconds * 1000 - remaining;
    return Math.min(100, (elapsed / (info.totalSeconds * 1000)) * 100);
  };

  const getRemainingSeconds = (info: CooldownInfo) => {
    const remaining = Math.max(0, info.endTime - Date.now());
    return Math.ceil(remaining / 1000);
  };

  const handleBattle = async (olympiadId: string) => {
    setIsBattling(olympiadId);
    try {
      const result = await api.battleOlympiad(olympiadId);
      setOlympiadEnergy(result.newOlympiadEnergy);
      setBattleResult(result);
      setShowBattleResult(true);
      await refreshCharacter();

      // Hide result after 4 seconds
      setTimeout(() => {
        setShowBattleResult(false);
        setBattleResult(null);
      }, 4000);
    } catch (error: any) {
      console.error('Battle failed:', error);
      alert(error.message || 'Battle failed');
    } finally {
      setIsBattling(null);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'school': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'district': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'city': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'national': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[var(--bg-card)]" />
          <div className="absolute inset-0 rounded-full border-4 border-t-[var(--accent)] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Energy Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-[var(--text-primary)]">Quest Energy</span>
                <span className="text-sm font-bold text-blue-400">
                  {currentEnergy} / {maxEnergy}
                </span>
              </div>
              <div className="w-full bg-[var(--bg-primary)] rounded-full h-2 overflow-hidden border border-[var(--border)]">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                  style={{ width: `${(currentEnergy / maxEnergy) * 100}%` }}
                />
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1.5">
                +1 every {energyRegenMinutes} min
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quests List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--accent)]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            Tutoring Quests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {quests.map((quest) => {
              const cooldownInfo = cooldowns[quest.id];
              const isOnCooldown = cooldownInfo && cooldownInfo.endTime > Date.now();
              const canStart = !isOnCooldown && quest.meetsRequirements && currentEnergy >= quest.energyCost;
              const result = cooldownInfo?.result;

              return (
                <div
                  key={quest.id}
                  className={`p-4 rounded-xl border transition-all duration-300 ${
                    isOnCooldown && result
                      ? 'border-[var(--success)]/30 bg-gradient-to-r from-[var(--success-bg)] to-transparent'
                      : canStart
                      ? 'border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--accent)]/30 hover:shadow-[var(--shadow-md)]'
                      : 'border-[var(--border)] bg-[var(--bg-secondary)] opacity-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[var(--text-primary)]">{quest.name}</h3>

                      {isOnCooldown && result ? (
                        <div className="mt-2 space-y-1.5 animate-fade-in">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="px-2 py-0.5 rounded-full bg-[var(--success)]/20 text-[var(--success)] font-medium">
                              +${result.cashEarned}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-medium">
                              +{result.subjectXpGained.xpGained} XP
                            </span>
                            {result.subjectXpGained.leveledUp && (
                              <span className="px-2 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] font-bold animate-pulse">
                                LVL UP!
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--text-muted)]">
                            {result.subjectXpGained.subjectName}
                          </p>
                          {result.itemDrop && (
                            <p className="text-sm text-purple-400 flex items-center gap-1">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
                                <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
                              </svg>
                              {result.itemDrop.itemName}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--text-muted)] mt-1">{quest.description}</p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                          </svg>
                          {quest.energyCost}
                        </span>
                        <span className="px-2 py-1 bg-[var(--success)]/10 text-[var(--success)] rounded-lg border border-[var(--success)]/20">
                          ${quest.rewards.cashMin}-{quest.rewards.cashMax}
                        </span>
                        <span className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20">
                          {quest.rewards.subjectXpMin}-{quest.rewards.subjectXpMax} XP
                        </span>
                        {quest.rewards.itemChance > 0 && (
                          <span className="px-2 py-1 bg-[var(--accent)]/10 text-[var(--accent)] rounded-lg border border-[var(--border-accent)]">
                            {Math.round(quest.rewards.itemChance * 100)}% drop
                          </span>
                        )}
                      </div>
                      {!quest.meetsRequirements && (
                        <p className="text-xs text-[var(--danger)] mt-2 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                          Requires Lv.{quest.requiredCharacterLevel} / Lv.{quest.requiredSubjectLevel} subjects
                        </p>
                      )}
                    </div>
                    <div className="ml-4 flex items-center">
                      {isOnCooldown && cooldownInfo ? (
                        <CircularProgress
                          progress={getCooldownProgress(cooldownInfo)}
                          size={56}
                          strokeWidth={4}
                        >
                          <span className="text-sm font-mono font-bold text-[var(--accent)]">
                            {getRemainingSeconds(cooldownInfo)}s
                          </span>
                        </CircularProgress>
                      ) : (
                        <button
                          onClick={() => handleStartQuest(quest.id)}
                          disabled={!canStart || isStarting === quest.id}
                          className={`px-5 py-2.5 rounded-xl font-semibold transition-all active:scale-95 ${
                            canStart
                              ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] text-[var(--bg-primary)] hover:shadow-[0_0_20px_var(--accent-glow)]'
                              : 'bg-[var(--bg-card)] text-[var(--text-muted)] cursor-not-allowed border border-[var(--border)]'
                          } disabled:opacity-50`}
                        >
                          {isStarting === quest.id ? (
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            'Start'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Olympiad Energy Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-[var(--text-primary)]">Olympiad Energy</span>
                <span className="text-sm font-bold text-purple-400">
                  {olympiadEnergy} / {olympiadEnergyMax}
                </span>
              </div>
              <div className="w-full bg-[var(--bg-primary)] rounded-full h-2 overflow-hidden border border-[var(--border)]">
                <div
                  className="bg-gradient-to-r from-purple-500 to-purple-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                  style={{ width: `${(olympiadEnergy / olympiadEnergyMax) * 100}%` }}
                />
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1.5">
                +1 every 5 min
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Battle Result Modal */}
      {showBattleResult && battleResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className={`glass rounded-2xl border-2 p-6 w-full max-w-sm shadow-2xl animate-slide-up ${
            battleResult.won
              ? 'border-[var(--success)]/50 bg-[var(--success-bg)]'
              : 'border-[var(--danger)]/50 bg-red-500/10'
          }`}>
            {/* Result header */}
            <div className="text-center mb-4">
              <div className={`text-4xl font-bold ${battleResult.won ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                {battleResult.won ? 'VICTORY!' : 'DEFEAT'}
              </div>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                vs Lv.{battleResult.npcLevel} opponent
              </p>
            </div>

            {/* Scores */}
            <div className="flex items-center justify-center gap-6 mb-4">
              <div className="text-center">
                <p className="text-xs text-[var(--text-muted)]">You</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{battleResult.playerScore}</p>
              </div>
              <div className="text-[var(--text-muted)] text-xl">vs</div>
              <div className="text-center">
                <p className="text-xs text-[var(--text-muted)]">NPC</p>
                <p className="text-2xl font-bold text-[var(--text-secondary)]">{battleResult.npcScore}</p>
              </div>
            </div>

            {/* Rewards */}
            {battleResult.rewards && (
              <div className="space-y-2 pt-4 border-t border-[var(--border)]">
                <div className="flex items-center justify-center gap-4">
                  <span className="px-3 py-1.5 rounded-full bg-[var(--success)]/20 text-[var(--success)] font-semibold">
                    +${battleResult.rewards.cash}
                  </span>
                  <span className="px-3 py-1.5 rounded-full bg-purple-500/20 text-purple-400 font-semibold">
                    +{battleResult.rewards.xp} XP
                  </span>
                </div>
                {battleResult.rewards.itemDrop && (
                  <div className="flex items-center justify-center gap-2 text-[var(--accent)]">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
                      <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
                    </svg>
                    <span className="font-medium">{battleResult.rewards.itemDrop.itemName}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Olympiads List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Olympiads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {olympiads.map((olympiad) => {
              const canBattle = olympiad.isUnlocked && olympiad.canAfford;

              return (
                <div
                  key={olympiad.id}
                  className={`p-4 rounded-xl border transition-all duration-300 ${
                    canBattle
                      ? 'border-[var(--border)] bg-[var(--bg-elevated)] hover:border-purple-500/30 hover:shadow-[var(--shadow-md)]'
                      : 'border-[var(--border)] bg-[var(--bg-secondary)] opacity-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-[var(--text-primary)]">{olympiad.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getDifficultyColor(olympiad.difficulty)}`}>
                          {olympiad.difficulty.charAt(0).toUpperCase() + olympiad.difficulty.slice(1)}
                        </span>
                      </div>

                      {olympiad.subject && (
                        <p className="text-xs text-[var(--text-muted)] mb-2">
                          Subject: {olympiad.subject.name}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          {olympiad.energyCost}
                        </span>
                        <span className="px-2 py-1 bg-[var(--success)]/10 text-[var(--success)] rounded-lg border border-[var(--success)]/20">
                          ${olympiad.rewards.cash_min}-{olympiad.rewards.cash_max}
                        </span>
                        <span className="px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">
                          {olympiad.rewards.xp_min}-{olympiad.rewards.xp_max} XP
                        </span>
                        {olympiad.rewards.item_chance > 0 && (
                          <span className="px-2 py-1 bg-[var(--accent)]/10 text-[var(--accent)] rounded-lg border border-[var(--border-accent)]">
                            {Math.round(olympiad.rewards.item_chance * 100)}% drop
                          </span>
                        )}
                      </div>

                      {!olympiad.isUnlocked && (
                        <p className="text-xs text-[var(--danger)] mt-2 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                          Requires Level {olympiad.requiredLevel}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 flex items-center">
                      <button
                        onClick={() => handleBattle(olympiad.id)}
                        disabled={!canBattle || isBattling === olympiad.id}
                        className={`px-5 py-2.5 rounded-xl font-semibold transition-all active:scale-95 ${
                          canBattle
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                            : 'bg-[var(--bg-card)] text-[var(--text-muted)] cursor-not-allowed border border-[var(--border)]'
                        } disabled:opacity-50`}
                      >
                        {isBattling === olympiad.id ? (
                          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          'Battle'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {olympiads.length === 0 && (
              <div className="text-center py-8">
                <p className="text-[var(--text-muted)]">No olympiads available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
