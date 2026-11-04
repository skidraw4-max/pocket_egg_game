/**
 * QuestPanel - 일일 미션 · 일일 챌린지 · 주간 목표 패널
 */
import { useGame } from '@/contexts/GameContext';
import { useState, useCallback, type ReactNode } from 'react';
import type { DailyMission, DailyChallenge, WeeklyGoal } from '@/lib/gameState';
import { showRewardedAd } from '@/lib/admob';
import { TNK_PLACEMENT_MISSION } from '@/lib/tnkConfig';

interface QuestPanelProps {
  onClose: () => void;
}

type QuestSection = 'daily' | 'challenge' | 'weekly';

export default function QuestPanel({ onClose }: QuestPanelProps) {
  const {
    state,
    claimMission,
    claimMissionAd,
    claimDailyChallenge,
    claimWeeklyGoal,
  } = useGame();

  const [section, setSection] = useState<QuestSection>('daily');
  const [adLoadingMissionId, setAdLoadingMissionId] = useState<string | null>(null);

  const missions = Array.isArray(state.missions?.missions) ? state.missions.missions : [];
  const challenges = Array.isArray(state.dailyChallenges?.challenges) ? state.dailyChallenges.challenges : [];
  const weeklyGoals = Array.isArray(state.weeklyGoals?.goals) ? state.weeklyGoals.goals : [];

  const completedMissions = missions.filter(m => m.completed).length;
  const completedChallenges = challenges.filter(c => c.completed).length;
  const completedWeekly = weeklyGoals.filter(g => g.completed).length;

  const sectionTabs: { id: QuestSection; label: string; icon: string; done: number; total: number }[] = [
    { id: 'daily', label: '일일 미션', icon: '📋', done: completedMissions, total: missions.length },
    { id: 'challenge', label: '일일 챌린지', icon: '🎯', done: completedChallenges, total: challenges.length },
    { id: 'weekly', label: '주간 목표', icon: '📅', done: completedWeekly, total: weeklyGoals.length },
  ];

  const activeTab = sectionTabs.find(t => t.id === section)!;

  return (
    <div className="absolute inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-white/95 backdrop-blur-lg rounded-t-3xl pt-5 px-5 pb-app-safe shadow-2xl animate-slide-up max-h-[min(85dvh,100%)] flex flex-col min-h-0"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-warm-brown flex items-center gap-2">
              <span>{activeTab.icon}</span> {activeTab.label}
            </h2>
            <p className="text-xs text-sub-brown mt-0.5">
              {activeTab.done}/{activeTab.total} 완료
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-full bg-muted flex items-center justify-center text-sub-brown"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-1.5 mb-3">
          {sectionTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSection(tab.id)}
              className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-all ${
                section === tab.id
                  ? 'bg-peach text-white'
                  : 'bg-cream text-warm-brown'
              }`}
            >
              {tab.icon} {tab.label.split(' ')[1] ?? tab.label}
              {tab.done > 0 && tab.done === tab.total && ' ✓'}
            </button>
          ))}
        </div>

        <div className="w-full h-2 bubble-gauge overflow-hidden mb-4">
          <div
            className="h-full bg-peach rounded-full transition-all duration-500"
            style={{ width: `${activeTab.total ? (activeTab.done / activeTab.total) * 100 : 0}%` }}
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pb-2">
          {section === 'daily' && missions.map(mission => (
            <MissionCard
              key={mission.id}
              mission={mission}
              adLoading={adLoadingMissionId === mission.id}
              anyAdLoading={adLoadingMissionId !== null}
              onClaim={() => claimMission(mission.id)}
              onClaimAd={() => claimMissionAd(mission.id)}
              onAdLoadingChange={(loading) => {
                setAdLoadingMissionId(loading ? mission.id : null);
              }}
            />
          ))}

          {section === 'challenge' && (
            <>
              <div className="mb-1 bg-amber-50 border border-amber-100 rounded-2xl px-3 py-2 text-[10px] text-amber-700">
                미니게임·쓰다듬기로 달성! 매일 자정에 리셋돼요.
              </div>
              {challenges.map(challenge => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  onClaim={() => claimDailyChallenge(challenge.id)}
                />
              ))}
            </>
          )}

          {section === 'weekly' && (
            <>
              <div className="mb-1 bg-purple-50 border border-purple-100 rounded-2xl px-3 py-2 text-[10px] text-purple-700">
                매주 월요일(ISO 주) 기준으로 리셋 · 젬 보상!
              </div>
              {weeklyGoals.map(goal => (
                <WeeklyGoalCard
                  key={goal.id}
                  goal={goal}
                  onClaim={() => claimWeeklyGoal(goal.id)}
                />
              ))}
            </>
          )}
        </div>

        <style>{`
          @keyframes slide-up {
            from { transform: translateY(100%); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
          .animate-slide-up {
            animation: slide-up 300ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
          }
        `}</style>
      </div>
    </div>
  );
}

interface MissionCardProps {
  mission: DailyMission;
  adLoading: boolean;
  anyAdLoading: boolean;
  onClaim: () => void;
  onClaimAd: () => void;
  onAdLoadingChange: (loading: boolean) => void;
}

function MissionCard({
  mission,
  adLoading,
  anyAdLoading,
  onClaim,
  onClaimAd,
  onAdLoadingChange,
}: MissionCardProps) {
  const progressPct = Math.min((mission.current / mission.target) * 100, 100);
  const [adToast, setAdToast] = useState<string | null>(null);

  const handleAdClaim = useCallback(async () => {
    if (adLoading || anyAdLoading) return;
    onAdLoadingChange(true);
    setAdToast(null);
    try {
      const result = await showRewardedAd(TNK_PLACEMENT_MISSION);
      if (result.rewarded) {
        onClaimAd();
        setAdToast('💎 젠 +1 획득! 광고 시청 감사해요 🎉');
      } else if (result.reason === 'web_unsupported') {
        setAdToast('📱 광고는 Android 앱에서만 이용할 수 있어요.');
      } else if (result.reason === 'not_loaded' || result.reason === 'error') {
        setAdToast('광고를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
      } else {
        setAdToast('광고를 끝까지 시청해야 보상을 받을 수 있어요.');
      }
    } catch {
      setAdToast('광고를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      onAdLoadingChange(false);
      setTimeout(() => setAdToast(null), 4000);
    }
  }, [adLoading, anyAdLoading, onClaimAd, onAdLoadingChange]);

  return (
    <QuestItemCard
      icon={mission.claimed && mission.adRewardClaimed ? '✅' : mission.icon}
      title={mission.title}
      description={mission.description}
      current={mission.current}
      target={mission.target}
      completed={mission.completed}
      claimed={mission.claimed}
      rewardText={`🪙 ${mission.reward.coins} · ✨ EXP ${mission.reward.exp}`}
      onClaim={onClaim}
      extra={
        mission.claimed && !mission.adRewardClaimed ? (
          <div className="mt-2">
            <button
              onClick={handleAdClaim}
              disabled={adLoading || anyAdLoading}
              className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl text-xs font-bold bg-[oklch(0.88_0.12_60)] text-[oklch(0.35_0.10_60)] disabled:opacity-60"
            >
              {adLoading ? '⏳ 광고 로딩...' : '📺 광고 보기 +💎1'}
            </button>
            {adToast && <p className="mt-1 text-center text-[10px]">{adToast}</p>}
          </div>
        ) : null
      }
      progressPct={progressPct}
    />
  );
}

function ChallengeCard({ challenge, onClaim }: { challenge: DailyChallenge; onClaim: () => void }) {
  const progressPct = Math.min((challenge.current / challenge.target) * 100, 100);
  const rewardParts = [`🪙 ${challenge.reward.coins}`];
  if (challenge.reward.sparkleFragments) {
    rewardParts.push(`✨ ${challenge.reward.sparkleFragments}`);
  }

  return (
    <QuestItemCard
      icon={challenge.claimed ? '✅' : challenge.icon}
      title={challenge.title}
      description={challenge.description}
      current={challenge.current}
      target={challenge.target}
      completed={challenge.completed}
      claimed={challenge.claimed}
      rewardText={rewardParts.join(' · ')}
      onClaim={onClaim}
      progressPct={progressPct}
    />
  );
}

function WeeklyGoalCard({ goal, onClaim }: { goal: WeeklyGoal; onClaim: () => void }) {
  const progressPct = Math.min((goal.current / goal.target) * 100, 100);
  const rewardParts = [`💎 ${goal.reward.gems}`];
  if (goal.reward.coins) rewardParts.push(`🪙 ${goal.reward.coins}`);

  return (
    <QuestItemCard
      icon={goal.claimed ? '✅' : goal.icon}
      title={goal.title}
      description={goal.description}
      current={goal.current}
      target={goal.target}
      completed={goal.completed}
      claimed={goal.claimed}
      rewardText={rewardParts.join(' · ')}
      onClaim={onClaim}
      progressPct={progressPct}
    />
  );
}

interface QuestItemCardProps {
  icon: string;
  title: string;
  description: string;
  current: number;
  target: number;
  completed: boolean;
  claimed: boolean;
  rewardText: string;
  onClaim: () => void;
  progressPct: number;
  extra?: ReactNode;
}

function QuestItemCard({
  icon, title, description, current, target, completed, claimed, rewardText, onClaim, progressPct, extra,
}: QuestItemCardProps) {
  return (
    <div
      className={`rounded-2xl p-3 border transition-all ${
        claimed
          ? 'bg-muted/40 border-border'
          : completed
            ? 'bg-[oklch(0.96_0.04_140)]/60 border-mint'
            : 'bg-cream border-border'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
          claimed ? 'bg-muted' : completed ? 'bg-mint/40' : 'bg-white/70'
        }`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-sm font-bold truncate ${claimed ? 'text-sub-brown line-through' : 'text-warm-brown'}`}>
              {title}
            </span>
            {completed && !claimed && (
              <button
                onClick={onClaim}
                className="flex-shrink-0 text-xs font-bold bg-peach text-white px-3 py-1 rounded-full active:scale-95"
              >
                수령
              </button>
            )}
            {claimed && (
              <span className="text-[10px] text-sub-brown bg-muted px-2 py-0.5 rounded-full">완료</span>
            )}
          </div>
          <p className="text-[11px] text-sub-brown mt-0.5">{description}</p>
          <div className="mt-1.5">
            <div className="w-full h-1.5 bubble-gauge overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${completed ? 'bg-mint' : 'bg-peach/70'}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between mt-0.5">
              <span className="text-[10px] text-sub-brown">{current}/{target}</span>
              <span className="text-[10px] text-sub-brown">{rewardText}</span>
            </div>
          </div>
          {extra}
        </div>
      </div>
    </div>
  );
}
