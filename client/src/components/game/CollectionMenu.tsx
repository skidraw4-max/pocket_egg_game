/**
 * CollectionMenu - 도감 화면
 * Cozy Nursery: 수집한 반려몬 종족 목록
 */
import { useGame } from '@/contexts/GameContext';

interface CollectionMenuProps {
  onClose: () => void;
}

interface MonEntry {
  name: string;
  stage: string;
  icon: string;
  description: string;
}

const ALL_MONS: MonEntry[] = [
  { name: '기본몬', stage: '아기', icon: '🥚', description: '알에서 갓 태어난 순수한 반려몬' },
  { name: '파워몬', stage: '어린이', icon: '💪', description: '힘이 넘치는 활발한 반려몬' },
  { name: '위즈몬', stage: '어린이', icon: '🧠', description: '호기심 가득한 똑똑한 반려몬' },
  { name: '러블리몬', stage: '어린이', icon: '💖', description: '사랑스러운 매력의 반려몬' },
  { name: '그린몬', stage: '어린이', icon: '🌿', description: '자연을 사랑하는 건강한 반려몬' },
  { name: '드래곤몬', stage: '청소년', icon: '🐉', description: '강력한 힘을 가진 용 반려몬' },
  { name: '매직몬', stage: '청소년', icon: '🔮', description: '마법을 부리는 신비한 반려몬' },
  { name: '엔젤몬', stage: '청소년', icon: '👼', description: '천사처럼 아름다운 반려몬' },
  { name: '포레스몬', stage: '청소년', icon: '🌳', description: '숲의 수호자 반려몬' },
  { name: '레전드몬', stage: '성체', icon: '👑', description: '전설의 최종 진화 반려몬' },
];

export default function CollectionMenu({ onClose }: CollectionMenuProps) {
  const { state } = useGame();
  const collected = state.collection;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-[90%] max-w-sm bg-white/95 backdrop-blur-lg rounded-3xl p-5 shadow-2xl animate-pop-in max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-warm-brown flex items-center gap-2">
            <span>📖</span> 반려몬 도감
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-sub-brown">{collected.length}/{ALL_MONS.length}</span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sub-brown"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 도감 목록 */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {ALL_MONS.map(mon => {
            const isCollected = collected.includes(mon.name);
            return (
              <div
                key={mon.name}
                className={`flex items-center gap-3 p-3 rounded-2xl border ${
                  isCollected
                    ? 'bg-cream border-peach/30'
                    : 'bg-muted/50 border-border opacity-50'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xl shadow-sm">
                  {isCollected ? mon.icon : '❓'}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-warm-brown">
                    {isCollected ? mon.name : '???'}
                  </div>
                  <div className="text-[10px] text-sub-brown">
                    {isCollected ? `${mon.stage} · ${mon.description}` : '아직 발견하지 못했어요'}
                  </div>
                </div>
                {isCollected && (
                  <span className="text-xs text-peach font-bold">✓</span>
                )}
              </div>
            );
          })}
        </div>

        <style>{`
          @keyframes pop-in {
            0% { transform: scale(0.9); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
          .animate-pop-in {
            animation: pop-in 300ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
          }
        `}</style>
      </div>
    </div>
  );
}
