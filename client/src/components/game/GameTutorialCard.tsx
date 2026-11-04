/**
 * GameTutorialCard - 미니게임 시작 전 튜토리얼 카드 (방식 1)
 */
import { useState } from 'react';
import BottomSheetPanel from '@/components/ui/BottomSheetPanel';

export interface TutorialStep {
  icon: string;
  title: string;
  description: string;
}

export interface RewardInfo {
  grade: string;
  condition: string;
  reward: string;
  color: string;
}

export interface TutorialData {
  gameId: string;
  gameIcon: string;
  gameTitle: string;
  subtitle: string;
  steps: TutorialStep[];
  rewards?: RewardInfo[];
  tip?: string;
}

interface GameTutorialCardProps {
  tutorial: TutorialData;
  onStart: (skipNext: boolean) => void;
  onClose: () => void;
}

export default function GameTutorialCard({ tutorial, onStart, onClose }: GameTutorialCardProps) {
  const [skipNext, setSkipNext] = useState(false);

  return (
    <div className="absolute inset-0 z-50 flex items-end" onClick={onClose}>
      <BottomSheetPanel
        className="bg-white/97 backdrop-blur-lg rounded-t-3xl shadow-2xl"
        maxHeight="90"
        onClick={e => e.stopPropagation()}
        header={
          <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-5 pt-5 pb-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{tutorial.gameIcon}</span>
                <div>
                  <h2 className="text-lg font-bold text-white">{tutorial.gameTitle}</h2>
                  <p className="text-xs text-white/80">{tutorial.subtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm"
              >
                ✕
              </button>
            </div>
          </div>
        }
        bodyClassName="px-5 py-4"
        footer={
          <>
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={skipNext}
                onChange={e => setSkipNext(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-400"
              />
              <span className="text-xs text-sub-brown">다음부터 이 안내를 보지 않기</span>
            </label>
            <button
              type="button"
              onClick={() => onStart(skipNext)}
              className="w-full py-4 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-bold text-base rounded-2xl shadow-md active:scale-95 transition-transform"
            >
              🎮 게임 시작!
            </button>
          </>
        }
      >
        <div className="mb-4">
          <h3 className="text-sm font-bold text-warm-brown mb-3 flex items-center gap-1">
            <span>📖</span> 게임 방법
          </h3>
          <div className="space-y-2">
            {tutorial.steps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 bg-cream rounded-2xl p-3">
                <div className="w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-lg">{step.icon}</span>
                    <span className="text-sm font-semibold text-warm-brown">{step.title}</span>
                  </div>
                  <p className="text-xs text-sub-brown leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {tutorial.rewards && tutorial.rewards.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-bold text-warm-brown mb-3 flex items-center gap-1">
              <span>🎁</span> 보상 안내
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {tutorial.rewards.map((r, idx) => (
                <div key={idx} className={`rounded-2xl p-3 border-2 ${r.color}`}>
                  <div className="text-sm font-bold mb-0.5">{r.grade}</div>
                  <div className="text-xs text-sub-brown mb-1">{r.condition}</div>
                  <div className="text-xs font-semibold text-warm-brown">{r.reward}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tutorial.tip && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 mb-4">
            <p className="text-xs text-blue-700 flex items-start gap-1.5">
              <span className="text-base flex-shrink-0">💡</span>
              <span>{tutorial.tip}</span>
            </p>
          </div>
        )}
      </BottomSheetPanel>
    </div>
  );
}
