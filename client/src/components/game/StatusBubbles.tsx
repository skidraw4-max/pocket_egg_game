/**
 * StatusBubbles - 상태 게이지 (배고픔, 기분, 청결, 피로)
 * 임계 표정 노출 우선순위: 청결 > 졸림 > 배고픔 > 심심함
 */
import { PetStatus } from '@/lib/gameState';
import { resolveActiveStatusExpression, type StatusStat } from '@/lib/statusExpressions';
interface StatusBubblesProps {
  status: PetStatus;
  species: string;
}

const STATUS_CONFIG: {
  key: StatusStat;
  label: string;
  icon: string;
  color: string;
}[] = [
  { key: 'clean', label: '청결', icon: '💧', color: 'bg-[oklch(0.75_0.12_220)]' },
  { key: 'fatigue', label: '졸림', icon: '💤', color: 'bg-lavender' },
  { key: 'hunger', label: '배고픔', icon: '🍖', color: 'bg-peach' },
  { key: 'mood', label: '심심함', icon: '😊', color: 'bg-mint' },
];

export default function StatusBubbles({ status, species: _species }: StatusBubblesProps) {
  const active = resolveActiveStatusExpression(status);

  return (
    <div className="flex flex-col items-center gap-1.5 px-4 py-2">
      <div className="flex items-center justify-center gap-2">
        {STATUS_CONFIG.map(({ key, icon, color, label }) => {
          const gaugeValue = key === 'fatigue' ? 100 - status.fatigue : status[key];
          const isActive = active?.stat === key;

          return (
            <div key={key} className="flex flex-col items-center gap-1">
              <div
                className={`bg-white/80 backdrop-blur-sm rounded-full px-2 py-1 shadow-sm flex items-center gap-1 transition-all ${
                  isActive ? 'ring-2 ring-peach/60 scale-105' : ''
                }`}
                title={label}
              >
                <span className="text-sm">{icon}</span>
                <div className="w-12 h-2 bubble-gauge overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${color}`}
                    style={{ width: `${gaugeValue}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
