'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

type WeeklyEvent = Awaited<ReturnType<typeof api.getWeeklyOlympiad>>;
type Leaderboard = Awaited<ReturnType<typeof api.getWeeklyLeaderboard>>;

const tierColors: Record<string, { bg: string; text: string; border: string }> = {
  top10: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  top25: { bg: 'bg-gray-300/20', text: 'text-gray-300', border: 'border-gray-400/30' },
  top50: { bg: 'bg-orange-600/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  participation: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30' },
};

const tierLabels: Record<string, string> = {
  top10: 'Gold',
  top25: 'Silver',
  top50: 'Bronze',
  participation: 'Participant',
};

function formatTimeRemaining(targetDate: Date): string {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();

  if (diff <= 0) return 'Now';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function OlympiadsPage() {
  const [activeTab, setActiveTab] = useState<'event' | 'leaderboard' | 'rewards'>('event');
  const [weeklyData, setWeeklyData] = useState<WeeklyEvent | null>(null);
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [joinResult, setJoinResult] = useState<{ score: number; rank: number } | null>(null);
  const [claimResult, setClaimResult] = useState<{ cash: number; xp: number; tier: string } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      const data = await api.getWeeklyOlympiad();
      setWeeklyData(data);

      if (data.event) {
        const lb = await api.getWeeklyLeaderboard(data.event.id, 50, 0);
        setLeaderboard(lb);
      }
    } catch (err) {
      console.error('Failed to load olympiad data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!weeklyData?.event) return;

    const updateTimer = () => {
      const event = weeklyData.event!;
      const startsAt = new Date(event.startsAt);
      const endsAt = new Date(event.endsAt);
      const now = new Date();

      if (event.status === 'upcoming') {
        setTimeRemaining(formatTimeRemaining(startsAt));
      } else if (event.status === 'active') {
        setTimeRemaining(formatTimeRemaining(endsAt));
      } else {
        setTimeRemaining('Ended');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [weeklyData]);

  const handleJoin = async () => {
    if (!weeklyData?.event) return;
    setIsJoining(true);
    try {
      const result = await api.joinWeeklyOlympiad(weeklyData.event.id);
      setJoinResult({ score: result.score, rank: result.rank });
      await loadData();
      setTimeout(() => setJoinResult(null), 3000);
    } catch (err) {
      console.error('Failed to join:', err);
    } finally {
      setIsJoining(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!weeklyData?.event) return;
    setIsClaiming(true);
    try {
      const result = await api.claimWeeklyRewards(weeklyData.event.id);
      setClaimResult({ cash: result.rewards.cash, xp: result.rewards.xp, tier: result.tier });
      await loadData();
      setTimeout(() => setClaimResult(null), 3000);
    } catch (err) {
      console.error('Failed to claim rewards:', err);
    } finally {
      setIsClaiming(false);
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

  const event = weeklyData?.event;
  const participation = weeklyData?.participation;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Join Result Toast */}
      {joinResult && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
          <div className="glass rounded-xl border border-[var(--success)]/30 shadow-lg px-4 py-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--success)]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-[var(--success)] font-medium">
              Joined! Score: {joinResult.score} | Rank #{joinResult.rank}
            </span>
          </div>
        </div>
      )}

      {/* Claim Result Toast */}
      {claimResult && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
          <div className="glass rounded-xl border border-[var(--success)]/30 shadow-lg px-4 py-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--success)]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-[var(--success)] font-medium">
              {tierLabels[claimResult.tier]} rewards: +${claimResult.cash} +{claimResult.xp} XP
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 p-1 rounded-xl bg-[var(--bg-card)]">
        <button
          onClick={() => setActiveTab('event')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            activeTab === 'event'
              ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Event
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            activeTab === 'leaderboard'
              ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Leaderboard
        </button>
        <button
          onClick={() => setActiveTab('rewards')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            activeTab === 'rewards'
              ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Rewards
        </button>
      </div>

      {activeTab === 'event' && (
        <div className="space-y-4">
          {!event ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-4xl mb-4">🏆</div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                  No Active Event
                </h3>
                <p className="text-[var(--text-muted)]">
                  Weekly olympiads start every Sunday at 18:00 UTC
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Event Banner */}
              <Card className="border-[var(--accent)]/30">
                <CardContent className="py-6">
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        event.status === 'active'
                          ? 'bg-[var(--success)]/20 text-[var(--success)]'
                          : event.status === 'upcoming'
                          ? 'bg-[var(--warning)]/20 text-[var(--warning)]'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {event.status === 'active' ? 'LIVE' : event.status === 'upcoming' ? 'UPCOMING' : 'ENDED'}
                      </span>
                    </div>

                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                      {event.name}
                    </h2>

                    {event.subject && (
                      <div className="text-[var(--accent)]">
                        Focus: {event.subject.name}
                      </div>
                    )}

                    <div className="text-3xl font-mono text-[var(--text-primary)]">
                      {event.status === 'upcoming' ? (
                        <>Starts in {timeRemaining}</>
                      ) : event.status === 'active' ? (
                        <>Ends in {timeRemaining}</>
                      ) : (
                        'Event Ended'
                      )}
                    </div>

                    <div className="text-[var(--text-muted)]">
                      {event.totalParticipants} participants
                    </div>

                    {/* Join or Status */}
                    {event.status === 'active' && !participation && (
                      <button
                        onClick={handleJoin}
                        disabled={isJoining}
                        className="w-full max-w-xs mx-auto py-3 px-6 rounded-xl bg-[var(--accent)] text-[var(--bg-primary)] font-semibold hover:bg-[var(--accent-hover)] transition-all disabled:opacity-50"
                      >
                        {isJoining ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Joining...
                          </div>
                        ) : (
                          'Join Olympiad'
                        )}
                      </button>
                    )}

                    {participation && (
                      <div className="p-4 rounded-xl bg-[var(--bg-secondary)]">
                        <div className="text-sm text-[var(--text-muted)] mb-1">Your Performance</div>
                        <div className="flex items-center justify-center gap-6">
                          <div>
                            <div className="text-2xl font-bold text-[var(--text-primary)]">
                              #{participation.rank ?? '-'}
                            </div>
                            <div className="text-xs text-[var(--text-muted)]">Rank</div>
                          </div>
                          <div className="w-px h-10 bg-[var(--border)]" />
                          <div>
                            <div className="text-2xl font-bold text-[var(--accent)]">
                              {participation.score}
                            </div>
                            <div className="text-xs text-[var(--text-muted)]">Score</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Reward Tiers Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Reward Tiers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(event.rewardsByPercentile).map(([tier, rewards]) => {
                    const colors = tierColors[tier] || tierColors.participation;
                    return (
                      <div
                        key={tier}
                        className={`flex items-center justify-between p-3 rounded-lg border ${colors.bg} ${colors.border}`}
                      >
                        <div className={`font-medium ${colors.text}`}>
                          {tierLabels[tier]}
                          <span className="text-xs ml-2 opacity-70">
                            ({tier === 'top10' ? 'Top 10%' : tier === 'top25' ? 'Top 25%' : tier === 'top50' ? 'Top 50%' : 'All'})
                          </span>
                        </div>
                        <div className="text-sm text-[var(--text-secondary)]">
                          ${rewards.cash} + {rewards.xp} XP
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <Card>
          <CardHeader>
            <CardTitle>Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            {!event ? (
              <div className="py-8 text-center text-[var(--text-muted)]">
                No active event
              </div>
            ) : !leaderboard || leaderboard.leaderboard.length === 0 ? (
              <div className="py-8 text-center text-[var(--text-muted)]">
                No participants yet
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.leaderboard.map((entry) => {
                  const totalParticipants = leaderboard.totalParticipants;
                  const percentile = ((totalParticipants - entry.rank) / totalParticipants) * 100;
                  const tier = percentile >= 90 ? 'top10' : percentile >= 75 ? 'top25' : percentile >= 50 ? 'top50' : 'participation';
                  const colors = tierColors[tier];

                  return (
                    <div
                      key={entry.rank}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        entry.isCurrentUser
                          ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/30'
                          : 'bg-[var(--bg-secondary)]'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${colors.bg} ${colors.text}`}>
                        {entry.rank <= 3 ? (
                          entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'
                        ) : (
                          entry.rank
                        )}
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium ${entry.isCurrentUser ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
                          {entry.username}
                          {entry.isCurrentUser && ' (You)'}
                        </div>
                      </div>
                      <div className="text-lg font-bold text-[var(--text-primary)]">
                        {entry.score}
                      </div>
                    </div>
                  );
                })}

                {leaderboard.totalParticipants > leaderboard.leaderboard.length && (
                  <div className="text-center text-[var(--text-muted)] py-2">
                    +{leaderboard.totalParticipants - leaderboard.leaderboard.length} more participants
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'rewards' && (
        <Card>
          <CardHeader>
            <CardTitle>Your Rewards</CardTitle>
          </CardHeader>
          <CardContent>
            {!event ? (
              <div className="py-8 text-center text-[var(--text-muted)]">
                No event data available
              </div>
            ) : !participation ? (
              <div className="py-8 text-center text-[var(--text-muted)]">
                You haven't participated in this event
              </div>
            ) : event.status !== 'ended' ? (
              <div className="py-8 text-center space-y-4">
                <div className="text-4xl">⏳</div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  Event Still Active
                </h3>
                <p className="text-[var(--text-muted)]">
                  Rewards can be claimed after the event ends
                </p>
                <div className="p-4 rounded-xl bg-[var(--bg-secondary)]">
                  <div className="text-sm text-[var(--text-muted)] mb-1">Current Standing</div>
                  <div className="text-2xl font-bold text-[var(--text-primary)]">
                    Rank #{participation.rank ?? '-'}
                  </div>
                </div>
              </div>
            ) : participation.rewardsClaimed ? (
              <div className="py-8 text-center space-y-4">
                <div className="text-4xl">✅</div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  Rewards Claimed
                </h3>
                <p className="text-[var(--text-muted)]">
                  You've already claimed your rewards for this event
                </p>
              </div>
            ) : (
              <div className="py-4 space-y-6">
                <div className="text-center">
                  <div className="text-6xl mb-4">🏆</div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                    Congratulations!
                  </h3>
                  <p className="text-[var(--text-muted)]">
                    You finished rank #{participation.rank}
                  </p>
                </div>

                <button
                  onClick={handleClaimRewards}
                  disabled={isClaiming}
                  className="w-full py-4 rounded-xl bg-[var(--accent)] text-[var(--bg-primary)] font-semibold hover:bg-[var(--accent-hover)] transition-all disabled:opacity-50"
                >
                  {isClaiming ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Claiming...
                    </div>
                  ) : (
                    'Claim Rewards'
                  )}
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
