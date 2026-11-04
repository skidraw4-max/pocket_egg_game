import { useEffect } from 'react';
import { useCharacterImage } from '@/hooks/useCharacterSkin';
import { STAGE_LABEL } from '@/lib/stageLabels';
import type { MonEntry } from '@/lib/speciesRegistry';

interface CollectionCharacterModalProps {
  mon: MonEntry;
  onClose: () => void;
}

export default function CollectionCharacterModal({ mon, onClose }: CollectionCharacterModalProps) {
  const imgUrl = useCharacterImage(mon.name, mon.stage);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm overlay-screen"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-pop-in"
        style={{
          background: mon.gradeBg,
          border: `2px solid ${mon.gradeBorder}`,
          boxShadow: `0 8px 32px ${mon.gradeColor}40`,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{
            background: `linear-gradient(135deg, ${mon.gradeColor} 0%, ${mon.gradeBorder} 100%)`,
          }}
        >
          <div>
            <h3 className="text-white font-bold text-lg">{mon.name}</h3>
            <p className="text-white/80 text-xs">도감 상세</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/90 hover:text-white text-xl leading-none transition-colors"
            style={{ background: 'rgba(255,255,255,0.2)' }}
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-5 flex flex-col items-center">
          <div className="relative mb-4">
            <img
              src={imgUrl}
              alt={mon.name}
              className="w-44 h-44 object-contain drop-shadow-xl"
            />
            <span
              className="absolute bottom-0 right-0 text-[10px] font-bold text-white px-2 py-0.5 rounded-full shadow"
              style={{ background: mon.gradeColor }}
            >
              {STAGE_LABEL[mon.stage] ?? mon.stage}
            </span>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{
                background: `${mon.gradeColor}25`,
                color: mon.gradeColor,
                border: `1px solid ${mon.gradeBorder}`,
              }}
            >
              {mon.stageLabel}
            </span>
            <span className="text-lg">{mon.icon}</span>
          </div>

          <p className="text-sm text-gray-700 text-center leading-relaxed mb-3">
            {mon.description}
          </p>

          <div
            className="w-full rounded-2xl px-4 py-3 text-center"
            style={{
              background: `${mon.gradeColor}12`,
              border: `1px solid ${mon.gradeBorder}`,
            }}
          >
            <p className="text-[10px] font-bold mb-1" style={{ color: mon.gradeColor }}>
              진화 힌트
            </p>
            <p className="text-xs text-gray-600 leading-relaxed">{mon.traitHint}</p>
          </div>
        </div>
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
  );
}
