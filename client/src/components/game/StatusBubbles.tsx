/**
 * StatusBubbles - 상태 게이지 (배고픔, 기분, 청결, 피로)
 * Cozy Nursery: 비눗방울 형태의 둥근 게이지
 */
import { PetStatus } from '@/lib/gameState';

interface StatusBubblesProps {
  status: PetStatus;
}

const STATUS_CONFIG = [
  { key: 'hunger' as const, label: '배고픔', icon: '🍖', color: 'bg-peach' },
  { key: 'mood' as const, label: '기분', icon: '😊', color: 'bg-mint' },
  { key: 'clean' as const, label: '청결', icon: '💧', color: 'bg-[oklch(0.75_0.12_220)]' },
  { key: 'fatigue' as const, label: '피로', icon: '💤', color: 'bg-lavender' },
];

export default function StatusBubbles({ status }: StatusBubblesProps) {
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-2">
      {STATUS_CONFIG.map(({ key, icon, color }) => {
        const value = key === 'fatigue' ? 100 - status[key] : status[key];
        return (
          <div
            key={key}
            className="flex flex-col items-center gap-1"
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-full px-2 py-1 shadow-sm flex items-center gap-1">
              <span className="text-sm">{icon}</span>
              <div className="w-12 h-2 bubble-gauge overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${color}`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
