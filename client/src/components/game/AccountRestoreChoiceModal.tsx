/**
 * AccountRestoreChoiceModal — Google 복원 시 로컬 vs 클라우드 저장 선택
 */
import type { SavePreview } from '@/lib/savePreview';
import { STAGE_EMOJI } from '@/lib/savePreview';

export interface RestoreChoiceData {
  local: SavePreview;
  cloud: SavePreview;
}

interface AccountRestoreChoiceModalProps {
  choice: RestoreChoiceData;
  choosing: boolean;
  onSelect: (pick: 'local' | 'cloud') => void;
}

function SaveCard({
  title,
  badge,
  preview,
  accent,
  onSelect,
  disabled,
}: {
  title: string;
  badge: string;
  preview: SavePreview;
  accent: 'purple' | 'emerald';
  onSelect: () => void;
  disabled: boolean;
}) {
  const border = accent === 'purple' ? 'border-purple-200 hover:border-purple-400' : 'border-emerald-200 hover:border-emerald-400';
  const btn = accent === 'purple'
    ? 'bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300'
    : 'bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300';

  return (
    <div className={`rounded-2xl border-2 ${border} bg-white p-4 flex flex-col gap-3 transition-colors`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-gray-800">{title}</p>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${accent === 'purple' ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600'}`}>
          {badge}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-3xl">{STAGE_EMOJI[preview.stageKey] ?? '🥚'}</span>
        <div className="min-w-0">
          <p className="font-extrabold text-gray-900 truncate">{preview.petName}</p>
          <p className="text-xs text-gray-500">{preview.species} · {preview.stage}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-50 rounded-xl px-3 py-2">
          <p className="text-gray-400">레벨</p>
          <p className="font-bold text-gray-800">Lv.{preview.level}</p>
        </div>
        <div className="bg-gray-50 rounded-xl px-3 py-2">
          <p className="text-gray-400">친밀도</p>
          <p className="font-bold text-gray-800">{preview.intimacy}</p>
        </div>
        <div className="bg-gray-50 rounded-xl px-3 py-2">
          <p className="text-gray-400">코인</p>
          <p className="font-bold text-gray-800">{preview.coins.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 rounded-xl px-3 py-2">
          <p className="text-gray-400">젬</p>
          <p className="font-bold text-gray-800">{preview.gems.toLocaleString()}</p>
        </div>
      </div>

      <p className="text-[11px] text-gray-400">마지막 저장: {preview.savedAtLabel}</p>

      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        className={`w-full text-white text-sm font-bold rounded-xl py-2.5 transition-colors ${btn}`}
      >
        이 데이터 사용
      </button>
    </div>
  );
}

export default function AccountRestoreChoiceModal({
  choice,
  choosing,
  onSelect,
}: AccountRestoreChoiceModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 backdrop-blur-sm overlay-screen">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-5 py-4">
          <h2 className="text-white font-bold text-lg">저장 데이터 선택</h2>
          <p className="text-white/80 text-xs mt-1">
            Google 계정에 연결할 게임 데이터를 선택해 주세요.
          </p>
        </div>

        <div className="p-4 space-y-3 max-h-[min(70dvh,560px)] overflow-y-auto">
          <SaveCard
            title="이 기기 (현재)"
            badge="로컬"
            preview={choice.local}
            accent="purple"
            onSelect={() => onSelect('local')}
            disabled={choosing}
          />
          <SaveCard
            title="Google 클라우드"
            badge="클라우드"
            preview={choice.cloud}
            accent="emerald"
            onSelect={() => onSelect('cloud')}
            disabled={choosing}
          />
        </div>

        {choosing && (
          <p className="px-4 pb-4 text-center text-xs text-gray-400">선택한 데이터를 연결하는 중...</p>
        )}
      </div>
    </div>
  );
}
