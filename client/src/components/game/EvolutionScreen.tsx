/**
 * EvolutionScreen - 진화 연출 화면
 * 이전 모습 → 섬광 → 새 모습 시퀀스 + mythic 전용 연출
 */
import { useEffect, useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { getCharacterImage, getStageVisual } from '@/lib/gameState';

type Phase = 'old' | 'flash' | 'new';

export default function EvolutionScreen() {
  const { pendingEvolution, confirmEvolution, state } = useGame();
  const [phase, setPhase] = useState<Phase>('old');

  useEffect(() => {
    if (!pendingEvolution) return;
    setPhase('old');
    const t1 = setTimeout(() => setPhase('flash'), 900);
    const t2 = setTimeout(() => setPhase('new'), 1600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pendingEvolution]);

  if (!pendingEvolution) return null;

  const isHatch = pendingEvolution.newStage === 'baby' && pendingEvolution.newSpecies === '기본몬';
  const isMythic = pendingEvolution.newStage === 'mythic';
  const oldImage = getCharacterImage(state.pet.species, state.pet.stage);
  const newImage = getCharacterImage(pendingEvolution.newSpecies, pendingEvolution.newStage);
  const visual = getStageVisual(pendingEvolution.newStage);

  const title = isHatch
    ? '🐣 부화 성공! 🐣'
    : isMythic
      ? '✨ 전설 진화! ✨'
      : '✨ 진화 완료! ✨';

  const subtitle = isHatch
    ? `🥚 알에서 ${state.pet.name}이(가) 태어났어요!`
    : isMythic
      ? `${state.pet.name}이(가) 신화의 모습으로 각성했어요!`
      : `${state.pet.name}이(가) 새로운 모습으로 진화했어요!`;

  const showImage = phase === 'old' ? oldImage : newImage;
  const showName = phase === 'old' ? state.pet.species : pendingEvolution.newSpecies;

  return (
    <div
      className="absolute inset-0 z-[100] flex items-center justify-center backdrop-blur-sm"
      style={{
        background: isMythic
          ? 'radial-gradient(circle at 50% 40%, rgba(167,139,250,0.45), rgba(0,0,0,0.55))'
          : 'rgba(0,0,0,0.45)',
      }}
    >
      <div
        className="bg-white/95 backdrop-blur-lg rounded-3xl p-6 mx-4 shadow-2xl animate-pop-in text-center max-w-sm w-full relative overflow-hidden"
        style={isMythic ? { border: '2px solid rgba(251,191,36,0.7)' } : undefined}
      >
        {isMythic && (
          <div className="absolute inset-0 pointer-events-none opacity-40">
            <span className="absolute top-4 left-6 text-xl animate-float-spark">✨</span>
            <span className="absolute top-10 right-8 text-lg animate-float-spark-delay">⭐</span>
            <span className="absolute bottom-24 left-10 text-base animate-float-spark">💫</span>
            <span className="absolute bottom-28 right-6 text-xl animate-float-spark-delay">🌟</span>
          </div>
        )}

        <div
          className="text-2xl font-bold mb-2"
          style={{
            fontFamily: 'Nunito, sans-serif',
            color: isMythic ? '#7C3AED' : '#FFB088',
          }}
        >
          {title}
        </div>

        <div className="my-4 relative h-40 flex items-center justify-center">
          {/* 오라 링 */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 150,
              height: 150,
              boxShadow: `0 0 40px 12px ${visual.glow}`,
              border: `2px solid ${visual.ring}`,
              opacity: phase === 'flash' ? 0.2 : 0.85,
              transition: 'opacity 300ms ease',
            }}
          />

          {phase === 'flash' ? (
            <div className="text-6xl animate-evo-flash">💥</div>
          ) : (
            <img
              key={`${phase}-${showImage}`}
              src={showImage}
              alt={showName}
              className="w-36 h-36 object-contain relative z-10"
              style={{
                transform: `scale(${phase === 'new' ? visual.scale : 0.95})`,
                transition: 'transform 400ms ease',
                filter: phase === 'new' ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.2))' : undefined,
                animation: phase === 'new' ? 'bounce-gentle 2s ease-in-out infinite' : 'none',
              }}
            />
          )}

          {phase === 'new' && visual.sparkle && (
            <div className="absolute inset-0 pointer-events-none">
              <span className="absolute top-2 left-8 text-lg animate-spin-slow opacity-70">⭐</span>
              <span className="absolute bottom-4 right-10 text-base animate-spin-slow opacity-60">✨</span>
            </div>
          )}
        </div>

        <div className="text-xl font-bold text-warm-brown mb-1">
          {phase === 'old' ? (
            <span className="opacity-70">{state.pet.species}</span>
          ) : phase === 'flash' ? (
            <span className="opacity-50">...</span>
          ) : (
            <>
              {state.pet.species !== pendingEvolution.newSpecies && (
                <span className="text-sub-brown text-sm block mb-0.5 line-through opacity-60">
                  {state.pet.species}
                </span>
              )}
              {pendingEvolution.newSpecies}
            </>
          )}
        </div>
        <div className="text-sm text-sub-brown mb-4">
          {phase === 'new' ? subtitle : phase === 'flash' ? '빛이 쏟아져요...' : '모습이 변하고 있어요...'}
        </div>

        {phase === 'new' && (
          <div className="bg-cream rounded-2xl p-3 mb-4 animate-fade-in">
            <div className="text-xs text-sub-brown mb-2 font-semibold">새로운 능력치</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {pendingEvolution.statBoosts.power ? (
                <div className="flex items-center gap-1">
                  <span>💪</span>
                  <span className="text-warm-brown">힘 +{pendingEvolution.statBoosts.power}</span>
                </div>
              ) : null}
              {pendingEvolution.statBoosts.intelligence ? (
                <div className="flex items-center gap-1">
                  <span>🧠</span>
                  <span className="text-warm-brown">지능 +{pendingEvolution.statBoosts.intelligence}</span>
                </div>
              ) : null}
              {pendingEvolution.statBoosts.charm ? (
                <div className="flex items-center gap-1">
                  <span>💖</span>
                  <span className="text-warm-brown">매력 +{pendingEvolution.statBoosts.charm}</span>
                </div>
              ) : null}
              {pendingEvolution.statBoosts.vitality ? (
                <div className="flex items-center gap-1">
                  <span>🌿</span>
                  <span className="text-warm-brown">활력 +{pendingEvolution.statBoosts.vitality}</span>
                </div>
              ) : null}
            </div>
            {isMythic && (
              <div className="mt-2 text-[11px] text-lavender font-semibold">
                Lv.40 전설 진화 달성!
              </div>
            )}
          </div>
        )}

        <button
          onClick={confirmEvolution}
          disabled={phase !== 'new'}
          className="w-full py-3 bg-peach text-white font-bold rounded-2xl cushion-btn text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          style={isMythic && phase === 'new' ? { background: 'linear-gradient(135deg, #7C3AED, #EC4899)' } : undefined}
        >
          {phase === 'new' ? '확인' : '진화 중...'}
        </button>

        <style>{`
          @keyframes pop-in {
            0% { transform: scale(0.8); opacity: 0; }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); opacity: 1; }
          }
          .animate-pop-in {
            animation: pop-in 500ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
          }
          @keyframes bounce-gentle {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .animate-spin-slow {
            animation: spin-slow 4s linear infinite;
          }
          @keyframes evo-flash {
            0% { transform: scale(0.6); opacity: 0.4; }
            50% { transform: scale(1.4); opacity: 1; }
            100% { transform: scale(1); opacity: 0.8; }
          }
          .animate-evo-flash {
            animation: evo-flash 700ms ease-out forwards;
          }
          @keyframes float-spark {
            0%, 100% { transform: translateY(0); opacity: 0.5; }
            50% { transform: translateY(-8px); opacity: 1; }
          }
          .animate-float-spark { animation: float-spark 2s ease-in-out infinite; }
          .animate-float-spark-delay { animation: float-spark 2.4s ease-in-out 0.4s infinite; }
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in { animation: fade-in 350ms ease-out forwards; }
        `}</style>
      </div>
    </div>
  );
}
