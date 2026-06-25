/**
 * NicknameModal - 플레이어 닉네임 설정/변경 모달
 * 반려몬 이름과 별개로 랭킹·친구 목록에 표시될 플레이어 이름을 설정합니다.
 */
import { useState } from 'react';
import { useGame } from '@/contexts/GameContext';

interface NicknameModalProps {
  onClose: () => void;
}

const PRESET_NICKNAMES = [
  '알 마스터', '에그 헌터', '포켓 탐험가', '진화 전문가',
  '알 수집가', '몬스터 박사', '포켓 요리사', '별빛 조련사',
];

export default function NicknameModal({ onClose }: NicknameModalProps) {
  const { state, setNickname, gameId } = useGame();
  const currentNickname = state.nickname || '';
  const [input, setInput] = useState(currentNickname);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const validate = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '닉네임을 입력해 주세요.';
    if (trimmed.length < 2) return '닉네임은 2자 이상이어야 합니다.';
    if (trimmed.length > 12) return '닉네임은 12자 이하여야 합니다.';
    if (/[<>{}[\]\\|]/.test(trimmed)) return '사용할 수 없는 문자가 포함되어 있습니다.';
    return '';
  };

  const handleSave = () => {
    const err = validate(input);
    if (err) { setError(err); return; }
    setNickname(input.trim());
    setSaved(true);
    setTimeout(() => onClose(), 1200);
  };

  const handlePreset = (name: string) => {
    setInput(name);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {/* 헤더 */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-5 text-center">
          <div className="text-4xl mb-2">✏️</div>
          <h2 className="text-white font-bold text-lg">닉네임 설정</h2>
          <p className="text-white/70 text-xs mt-1">
            랭킹과 친구 목록에 표시될 이름입니다
          </p>
        </div>

        <div className="p-5 space-y-4">

          {/* 현재 상태 */}
          {currentNickname && (
            <div className="bg-indigo-50 rounded-2xl px-4 py-2.5 flex items-center gap-2">
              <span className="text-sm text-indigo-400">현재 닉네임</span>
              <span className="font-bold text-indigo-600 text-sm">{currentNickname}</span>
            </div>
          )}

          {/* 입력 필드 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500">새 닉네임 (2~12자)</label>
            <div className={`flex items-center border-2 rounded-2xl px-4 transition-colors ${
              error ? 'border-red-300' : input ? 'border-indigo-300' : 'border-gray-200'
            }`}>
              <input
                type="text"
                value={input}
                onChange={(e) => { setInput(e.target.value); setError(''); setSaved(false); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                placeholder="닉네임을 입력하세요"
                maxLength={12}
                className="flex-1 py-3 text-sm bg-transparent outline-none text-gray-800"
                autoFocus
              />
              <span className={`text-xs font-medium ml-2 ${
                input.length > 10 ? 'text-red-400' : 'text-gray-300'
              }`}>
                {input.length}/12
              </span>
            </div>
            {error && <p className="text-xs text-red-500 pl-1">{error}</p>}
          </div>

          {/* 추천 닉네임 */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400">추천 닉네임</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_NICKNAMES.map((name) => (
                <button
                  key={name}
                  onClick={() => handlePreset(name)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    input === name
                      ? 'bg-indigo-500 text-white border-indigo-500'
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-500'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* 게임 ID 안내 */}
          {gameId && (
            <div className="bg-gray-50 rounded-2xl px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs text-gray-400">내 플레이어 ID</span>
              <span className="font-bold text-gray-600 font-mono text-sm">#{gameId}</span>
            </div>
          )}

          {/* 저장 완료 메시지 */}
          {saved && (
            <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-2.5 text-center">
              <p className="text-sm font-semibold text-green-600">✓ 닉네임이 저장되었습니다!</p>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-500 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saved || !input.trim()}
              className="flex-1 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-200 text-white text-sm font-bold transition-colors"
            >
              {saved ? '✓ 저장됨' : '저장하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
