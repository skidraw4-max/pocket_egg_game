import React, { useState } from 'react';
import { useGame } from '@/contexts/GameContext';

type Tab = 'ranking' | 'friends' | 'visitors' | 'sync';

const STAGE_EMOJI: Record<string, string> = {
  egg: '🥚',
  baby: '🐣',
  child: '🐥',
  teen: '🐦',
  adult: '🦅',
  mythic: '🌟',
};

const TAB_LABELS: Record<Tab, string> = {
  ranking: '🏆 랭킹',
  friends: '👫 친구',
  visitors: '👋 방문자',
  sync: '☁️ 동기화',
};

export default function SocialMenu({ onClose }: { onClose: () => void }) {
  const {
    ranking, visitors, friends, syncing, lastSynced, uid, state,
    visitFriend, addFriend, removeFriend, copyMyUid,
  } = useGame();

  const [tab, setTab] = useState<Tab>('friends');
  const [addUidInput, setAddUidInput] = useState('');
  const [addStatus, setAddStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [visitingUid, setVisitingUid] = useState<string | null>(null);
  const [visitStatus, setVisitStatus] = useState<{ uid: string; msg: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const myNickname = state.pet?.name ?? '알 주인';

  // ── 친구 추가 ──────────────────────────────
  const handleAddFriend = async () => {
    const trimmed = addUidInput.trim();
    if (!trimmed) return;
    setAddLoading(true);
    setAddStatus(null);
    const result = await addFriend(trimmed);
    setAddStatus({ type: result.success ? 'success' : 'error', msg: result.message });
    if (result.success) setAddUidInput('');
    setAddLoading(false);
  };

  // ── 친구 방문 ──────────────────────────────
  const handleVisit = async (targetUid: string) => {
    setVisitingUid(targetUid);
    const result = await visitFriend(targetUid, myNickname);
    setVisitStatus({ uid: targetUid, msg: result.message });
    setVisitingUid(null);
    setTimeout(() => setVisitStatus(null), 3000);
  };

  // ── UID 복사 ───────────────────────────────
  const handleCopyUid = async () => {
    const ok = await copyMyUid();
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-white font-bold text-lg">소셜</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-100 flex-shrink-0 overflow-x-auto">
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors whitespace-nowrap px-1 ${
                tab === t
                  ? 'text-purple-600 border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        <div className="p-4 overflow-y-auto flex-1">

          {/* ── 친구 탭 ── */}
          {tab === 'friends' && (
            <div className="space-y-3">
              {/* 친구 추가 입력 */}
              <div className="bg-purple-50 rounded-2xl p-3 space-y-2">
                <p className="text-xs font-semibold text-purple-600">친구 추가</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={addUidInput}
                    onChange={(e) => { setAddUidInput(e.target.value); setAddStatus(null); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddFriend()}
                    placeholder="친구의 플레이어 ID 입력"
                    className="flex-1 text-xs bg-white border border-purple-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400 font-mono"
                  />
                  <button
                    onClick={handleAddFriend}
                    disabled={addLoading || !addUidInput.trim()}
                    className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white text-xs font-bold rounded-xl px-3 py-2 transition-colors"
                  >
                    {addLoading ? '...' : '추가'}
                  </button>
                </div>
                {addStatus && (
                  <p className={`text-xs ${addStatus.type === 'success' ? 'text-green-600' : 'text-red-500'} whitespace-pre-line`}>
                    {addStatus.type === 'success' ? '✓' : '✗'} {addStatus.msg}
                  </p>
                )}
              </div>

              {/* 친구 목록 */}
              {friends.length === 0 ? (
                <p className="text-center text-gray-400 py-6 text-sm">
                  아직 친구가 없습니다.<br />
                  친구의 플레이어 ID를 입력해 추가해 보세요!
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 font-medium">친구 {friends.length}명</p>
                  {friends.map((f) => (
                    <div key={f.uid} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                      <span className="text-2xl">{STAGE_EMOJI[f.stage] ?? '🥚'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{f.nickname}</p>
                        <p className="text-xs text-gray-400">Lv.{f.level}</p>
                        {visitStatus?.uid === f.uid && (
                          <p className="text-xs text-green-500 mt-0.5">{visitStatus.msg}</p>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleVisit(f.uid)}
                          disabled={visitingUid === f.uid}
                          className="bg-pink-100 hover:bg-pink-200 text-pink-600 text-xs font-semibold rounded-xl px-2.5 py-1.5 transition-colors disabled:opacity-50"
                        >
                          {visitingUid === f.uid ? '...' : '방문'}
                        </button>
                        <button
                          onClick={() => removeFriend(f.uid)}
                          className="bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-400 text-xs font-semibold rounded-xl px-2.5 py-1.5 transition-colors"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── 랭킹 탭 ── */}
          {tab === 'ranking' && (
            <div className="space-y-2">
              {ranking.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">
                  아직 랭킹 데이터가 없습니다.<br />
                  게임을 플레이하면 자동으로 등록됩니다!
                </p>
              ) : (
                ranking.map((entry, i) => (
                  <div
                    key={entry.uid}
                    className={`flex items-center gap-3 p-3 rounded-2xl ${
                      entry.uid === uid ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="w-8 text-center">
                      {i === 0 ? <span className="text-xl">🥇</span>
                        : i === 1 ? <span className="text-xl">🥈</span>
                        : i === 2 ? <span className="text-xl">🥉</span>
                        : <span className="text-gray-400 font-bold text-sm">{i + 1}</span>}
                    </div>
                    <span className="text-2xl">{STAGE_EMOJI[entry.stage] ?? '🥚'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">
                        {entry.nickname}
                        {entry.uid === uid && <span className="ml-1 text-xs text-purple-500">(나)</span>}
                      </p>
                      <p className="text-xs text-gray-400">Lv.{entry.level} · 코인 {entry.coins.toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── 방문자 탭 ── */}
          {tab === 'visitors' && (
            <div className="space-y-2">
              {visitors.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">
                  아직 방문자가 없습니다.<br />
                  친구에게 내 플레이어 ID를 공유해 보세요!
                </p>
              ) : (
                visitors.map((v) => (
                  <div key={v.uid + v.visitedAt} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                    <span className="text-2xl">👤</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{v.nickname}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(v.visitedAt).toLocaleString('ko-KR', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── 동기화 탭 ── */}
          {tab === 'sync' && (
            <div className="space-y-4">
              {/* 동기화 상태 */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${syncing ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
                  <span className="text-sm font-medium text-gray-700">
                    {syncing ? '동기화 중...' : '동기화 완료'}
                  </span>
                </div>
                {lastSynced && (
                  <p className="text-xs text-gray-400">
                    마지막 저장: {lastSynced.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                )}
              </div>

              {/* 내 UID + 복사 버튼 */}
              <div className="bg-purple-50 rounded-2xl p-4 space-y-2">
                <p className="text-xs text-purple-400 font-medium">내 플레이어 ID</p>
                <p className="text-xs font-mono text-purple-700 break-all leading-relaxed">
                  {uid ?? '로그인 중...'}
                </p>
                <button
                  onClick={handleCopyUid}
                  className="w-full mt-1 bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold rounded-xl py-2 transition-colors"
                >
                  {copied ? '✓ 복사됨!' : '📋 ID 복사하기'}
                </button>
                <p className="text-xs text-gray-400">
                  이 ID를 친구에게 공유하면 친구가 나를 친구 추가하거나 방문할 수 있습니다.
                </p>
              </div>

              {/* 기능 안내 */}
              <div className="bg-blue-50 rounded-2xl p-4 space-y-1.5">
                <p className="text-xs font-semibold text-blue-600 mb-2">☁️ 클라우드 저장 기능</p>
                {[
                  '게임 플레이 5초 후 자동 저장',
                  '기기 변경 시 자동 복원',
                  '오프라인에서도 정상 동작',
                  '글로벌 랭킹 자동 등록',
                ].map((item) => (
                  <p key={item} className="text-xs text-blue-500 flex items-center gap-1.5">
                    <span>✓</span> {item}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
