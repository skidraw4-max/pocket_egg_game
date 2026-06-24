/**
 * QuestPanel - 일일 미션 패널
 * Cozy Nursery: 오늘의 미션 목록, 진행도, 보상 수령
 */
import { useGame } from '@/contexts/GameContext';
import type { DailyMission } from '@/lib/gameState';

interface QuestPanelProps {
  onClose: () => void;
}

export default function QuestPanel({ onClose }: QuestPanelProps) {
  const { state, claimMission } = useGame();
  const { missions } = state.missions;

  const completedCount = missions.filter(m => m.completed).length;
  const allClaimed = missions.every(m => m.claimed);

  return (
    <div className="absolute inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-white/95 backdrop-blur-lg rounded-t-3xl p-5 shadow-2xl animate-slide-up max-h-[80vh] flex flex-col"
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
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sub-brown"
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

        {/* 미션 목록 */}
        <div className="flex-1 overflow-y-auto space-y-3 pb-2">
          {missions.map(mission => (
            <MissionCard
              key={mission.id}
              mission={mission}
              onClaim={() => claimMission(mission.id)}
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
        `}</style>
      </div>
    </div>
  );
}

interface MissionCardProps {
  mission: DailyMission;
  onClaim: () => void;
}

function MissionCard({ mission, onClaim }: MissionCardProps) {
  const progressPct = Math.min((mission.current / mission.target) * 100, 100);

  return (
    <div
      className={`rounded-2xl p-3 border transition-all ${
        mission.claimed
          ? 'bg-muted/40 border-border opacity-60'
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
            {/* 보상 수령 버튼 */}
            {mission.completed && !mission.claimed && (
              <button
                onClick={onClaim}
                className="flex-shrink-0 text-xs font-bold bg-peach text-white px-3 py-1 rounded-full active:scale-95 transition-transform"
              >
                수령
              </button>
            )}
            {mission.claimed && (
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
        </div>
      </div>
    </div>
  );
}
