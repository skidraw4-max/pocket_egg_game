/**
 * CollectionMenu - 도감 화면
 * Cozy Nursery: 수집한 반려몬 종족 목록 + 실제 이미지 표시
 */
import { useGame } from '@/contexts/GameContext';
import { getCharacterImage } from '@/lib/gameState';

interface CollectionMenuProps {
  onClose: () => void;
}

interface MonEntry {
  name: string;
  stage: 'baby' | 'child' | 'teen' | 'adult';
  stageLabel: string;
  icon: string;
  description: string;
  traitHint: string;
}

const ALL_MONS: MonEntry[] = [
  {
    name: '기본몬',
    stage: 'baby',
    stageLabel: '아기',
    icon: '🥚',
    description: '알에서 갓 태어난 순수한 반려몬',
    traitHint: '모든 성향의 시작점',
  },
  {
    name: '파워몬',
    stage: 'child',
    stageLabel: '어린이',
    icon: '💪',
    description: '힘이 넘치는 활발한 반려몬',
    traitHint: '힘 성향 우세 시 진화',
  },
  {
    name: '위즈몬',
    stage: 'child',
    stageLabel: '어린이',
    icon: '🧠',
    description: '호기심 가득한 똑똑한 반려몬',
    traitHint: '지능 성향 우세 시 진화',
  },
  {
    name: '러블리몬',
    stage: 'child',
    stageLabel: '어린이',
    icon: '💖',
    description: '사랑스러운 매력의 반려몬',
    traitHint: '매력 성향 우세 시 진화',
  },
  {
    name: '그린몬',
    stage: 'child',
    stageLabel: '어린이',
    icon: '🌿',
    description: '자연을 사랑하는 건강한 반려몬',
    traitHint: '활력 성향 우세 시 진화',
  },
  {
    name: '드래곤몬',
    stage: 'teen',
    stageLabel: '청소년',
    icon: '🐉',
    description: '강력한 힘을 가진 용 반려몬',
    traitHint: '파워몬 → 힘 성향 심화',
  },
  {
    name: '매직몬',
    stage: 'teen',
    stageLabel: '청소년',
    icon: '🔮',
    description: '마법을 부리는 신비한 반려몬',
    traitHint: '위즈몬 → 지능 성향 심화',
  },
  {
    name: '엔젤몬',
    stage: 'teen',
    stageLabel: '청소년',
    icon: '👼',
    description: '천사처럼 아름다운 반려몬',
    traitHint: '러블리몬 → 매력 성향 심화',
  },
  {
    name: '포레스몬',
    stage: 'teen',
    stageLabel: '청소년',
    icon: '🌳',
    description: '숲의 수호자 반려몬',
    traitHint: '그린몬 → 활력 성향 심화',
  },
  {
    name: '레전드몬',
    stage: 'adult',
    stageLabel: '성체',
    icon: '👑',
    description: '모든 속성을 초월한 전설의 반려몬',
    traitHint: 'Lv.30 최종 진화',
  },
];

// 단계별 그룹 정의
const STAGE_GROUPS = [
  { label: '아기', stageLabel: '아기', color: 'text-peach' },
  { label: '어린이 (1차 진화)', stageLabel: '어린이', color: 'text-mint' },
  { label: '청소년 (2차 진화)', stageLabel: '청소년', color: 'text-[oklch(0.7_0.12_260)]' },
  { label: '성체 (최종 진화)', stageLabel: '성체', color: 'text-[oklch(0.65_0.15_30)]' },
];

export default function CollectionMenu({ onClose }: CollectionMenuProps) {
  const { state } = useGame();
  const collected = state.collection;
  const collectedCount = ALL_MONS.filter(m => collected.includes(m.name)).length;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-[92%] max-w-sm bg-white/95 backdrop-blur-lg rounded-3xl p-5 shadow-2xl animate-pop-in max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-warm-brown flex items-center gap-2">
            <span>📖</span> 반려몬 도감
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-peach/20 text-peach font-bold px-2 py-0.5 rounded-full">
              {collectedCount}/{ALL_MONS.length}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sub-brown"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 전체 진행 바 */}
        <div className="w-full h-2 bg-muted rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-peach rounded-full transition-all duration-500"
            style={{ width: `${(collectedCount / ALL_MONS.length) * 100}%` }}
          />
        </div>

        {/* 도감 목록 - 단계별 그룹 */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {STAGE_GROUPS.map(group => {
            const monsInGroup = ALL_MONS.filter(m => m.stageLabel === group.stageLabel);
            return (
              <div key={group.label}>
                <div className={`text-[11px] font-bold mb-2 ${group.color}`}>
                  {group.label}
                </div>
                <div className="space-y-2">
                  {monsInGroup.map(mon => {
                    const isCollected = collected.includes(mon.name);
                    const imgUrl = getCharacterImage(mon.name, mon.stage);
                    return (
                      <div
                        key={mon.name}
                        className={`flex items-center gap-3 p-2.5 rounded-2xl border transition-all ${
                          isCollected
                            ? 'bg-cream border-peach/30'
                            : 'bg-muted/40 border-border/50 opacity-60'
                        }`}
                      >
                        {/* 이미지 */}
                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm overflow-hidden flex-shrink-0">
                          {isCollected ? (
                            <img
                              src={imgUrl}
                              alt={mon.name}
                              className="w-11 h-11 object-contain"
                            />
                          ) : (
                            <span className="text-2xl grayscale opacity-40">❓</span>
                          )}
                        </div>

                        {/* 정보 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-warm-brown truncate">
                              {isCollected ? mon.name : '???'}
                            </span>
                            {isCollected && (
                              <span className="text-[9px] bg-peach/20 text-peach px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">
                                {mon.stageLabel}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-sub-brown truncate mt-0.5">
                            {isCollected ? mon.description : '아직 발견하지 못했어요'}
                          </div>
                          {isCollected && (
                            <div className="text-[9px] text-sub-brown/70 mt-0.5">
                              {mon.icon} {mon.traitHint}
                            </div>
                          )}
                        </div>

                        {/* 수집 체크 */}
                        {isCollected && (
                          <span className="text-peach font-bold text-sm flex-shrink-0">✓</span>
                        )}
                      </div>
                    );
                  })}
                </div>
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
