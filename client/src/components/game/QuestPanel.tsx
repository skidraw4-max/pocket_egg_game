/**
 * QuestPanel - 일일 미션 패널
 * Cozy Nursery: 오늘의 미션 목록, 진행도, 보상 수령
 *
 * 광고 보상 기능:
 *  - 미션 기본 보상 수령 후 광고 버튼(📺 광고 보기 +💎1) 노출
 *  - 광고 시청 완료 시 젬 +1 지급
 *  - 하루에 미션당 1회만 수령 가능 (adRewardClaimed 플래그)
 */
import { useGame } from '@/contexts/GameContext';
import { useState, useCallback } from 'react';
import type { DailyMission } from '@/lib/gameState';
import { showRewardedAd } from '@/lib/admob';

interface QuestPanelProps {
  onClose: () => void;
}

export default function QuestPanel({ onClose }: QuestPanelProps) {
  const { state, claimMission, claimMissionAd } = useGame();
  // missions 배열 방어 처리 (구버전 저장 데이터 대응)
  const missions = Array.isArray(state.missions?.missions) ? state.missions.missions : [];

  const completedCount = missions.filter(m => m.completed).length;
  const allClaimed = missions.every(m => m.claimed);

  return (
    <div className="absolute inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-white/95 backdrop-blur-lg rounded-t-3xl p-5 shadow-2xl animate-slide-up max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-warm-brown flex items-center gap-2">
              <span>📋</span> 오늘의 미션
            </h2>
            <p className="text-xs text-sub-brown mt-0.5">
              {completedCount}/{missions.length} 완료
              {allClaimed && ' · 모든 보상 수령 완료! 🎉'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-full bg-muted flex items-center justify-center text-sub-brown"
          >
            ✕
          </button>
        </div>

        {/* 전체 진행 바 */}
        <div className="w-full h-2 bubble-gauge overflow-hidden mb-4">
          <div
            className="h-full bg-peach rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / missions.length) * 100}%` }}
          />
        </div>

        {/* 광고 보상 안내 배너 */}
        <div className="mb-3 bg-[oklch(0.97_0.04_60)]/80 border border-[oklch(0.88_0.08_60)] rounded-2xl px-3 py-2 flex items-center gap-2">
          <span className="text-lg">📺</span>
          <div className="flex-1">
            <p className="text-xs font-semibold text-[oklch(0.45_0.12_60)]">광고 보상</p>
            <p className="text-[10px] text-[oklch(0.55_0.08_60)]">
              미션 완료 후 광고를 시청하면 💎 젬 +1을 추가로 받을 수 있어요!
            </p>
          </div>
        </div>

        {/* 미션 목록 */}
        <div className="flex-1 overflow-y-auto space-y-3 pb-2">
          {missions.map(mission => (
            <MissionCard
              key={mission.id}
              mission={mission}
              onClaim={() => claimMission(mission.id)}
              onClaimAd={() => claimMissionAd(mission.id)}
            />
          ))}
        </div>

        <style>{`
          @keyframes slide-up {
            from { transform: translateY(100%); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
          .animate-slide-up {
            animation: slide-up 300ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
          }
          @keyframes ad-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4); }
            50%       { box-shadow: 0 0 0 6px rgba(251, 191, 36, 0); }
          }
          .ad-btn-pulse {
            animation: ad-pulse 2s ease-in-out infinite;
          }
        `}</style>
      </div>
    </div>
  );
}

interface MissionCardProps {
  mission: DailyMission;
  onClaim: () => void;
  onClaimAd: () => void;
}

function MissionCard({ mission, onClaim, onClaimAd }: MissionCardProps) {
  const progressPct = Math.min((mission.current / mission.target) * 100, 100);
  const [adLoading, setAdLoading] = useState(false);
  const [adToast, setAdToast] = useState<string | null>(null);

  const handleAdClaim = useCallback(async () => {
    if (adLoading) return;
    setAdLoading(true);
    setAdToast(null);

    try {
      const result = await showRewardedAd();
      if (result.rewarded) {
        onClaimAd();
        setAdToast('💎 젬 +1 획득! 광고 시청 감사해요 🎉');
      } else {
        setAdToast('광고를 끝까지 시청해야 보상을 받을 수 있어요.');
      }
    } catch {
      setAdToast('광고를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setAdLoading(false);
      setTimeout(() => setAdToast(null), 3000);
    }
  }, [adLoading, onClaimAd]);

  return (
    <div
      className={`rounded-2xl p-3 border transition-all ${
        mission.claimed
          ? 'bg-muted/40 border-border'
          : mission.completed
            ? 'bg-[oklch(0.96_0.04_140)]/60 border-mint'
            : 'bg-cream border-border'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* 아이콘 */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
          mission.claimed ? 'bg-muted' : mission.completed ? 'bg-mint/40' : 'bg-white/70'
        }`}>
          {mission.claimed ? '✅' : mission.icon}
        </div>

        {/* 내용 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-sm font-bold truncate ${
              mission.claimed ? 'text-sub-brown line-through' : 'text-warm-brown'
            }`}>
              {mission.title}
            </span>

            {/* 보상 수령 버튼 (기본 보상 미수령 상태) */}
            {mission.completed && !mission.claimed && (
              <button
                onClick={onClaim}
                className="flex-shrink-0 text-xs font-bold bg-peach text-white px-3 py-1 rounded-full active:scale-95 transition-transform"
              >
                수령
              </button>
            )}

            {/* 완료 뱃지 (기본 보상 수령 완료 + 광고 보상도 수령 완료) */}
            {mission.claimed && mission.adRewardClaimed && (
              <span className="flex-shrink-0 text-[10px] text-sub-brown bg-muted px-2 py-0.5 rounded-full">
                완료
              </span>
            )}
          </div>

          <p className="text-[11px] text-sub-brown mt-0.5">{mission.description}</p>

          {/* 진행 바 */}
          <div className="mt-1.5">
            <div className="w-full h-1.5 bubble-gauge overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  mission.completed ? 'bg-mint' : 'bg-peach/70'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[10px] text-sub-brown">
                {mission.current}/{mission.target}
              </span>
              <span className="text-[10px] text-sub-brown">
                🪙 {mission.reward.coins} · ✨ EXP {mission.reward.exp}
              </span>
            </div>
          </div>

          {/* 광고 보상 버튼 (기본 보상 수령 완료 + 광고 보상 미수령 상태) */}
          {mission.claimed && !mission.adRewardClaimed && (
            <div className="mt-2">
              <button
                onClick={handleAdClaim}
                disabled={adLoading}
                className={`
                  w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl
                  text-xs font-bold transition-all active:scale-95
                  ${adLoading
                    ? 'bg-muted text-sub-brown cursor-wait'
                    : 'bg-[oklch(0.88_0.12_60)] text-[oklch(0.35_0.10_60)] ad-btn-pulse'
                  }
                `}
              >
                {adLoading ? (
                  <>
                    <span className="animate-spin inline-block">⏳</span>
                    <span>광고 로딩 중...</span>
                  </>
                ) : (
                  <>
                    {/* 광고 아이콘 배지 */}
                    <span className="bg-[oklch(0.70_0.15_30)] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none">
                      AD
                    </span>
                    <span>📺 광고 보기</span>
                    <span className="bg-white/60 px-1.5 py-0.5 rounded-full text-[10px] font-black text-[oklch(0.45_0.12_280)]">
                      +💎1
                    </span>
                  </>
                )}
              </button>

              {/* 광고 결과 토스트 */}
              {adToast && (
                <p className={`mt-1.5 text-center text-[10px] font-semibold px-2 py-1 rounded-lg ${
                  adToast.includes('획득')
                    ? 'bg-mint/30 text-[oklch(0.40_0.12_140)]'
                    : 'bg-[oklch(0.95_0.04_30)] text-[oklch(0.50_0.10_30)]'
                }`}>
                  {adToast}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
