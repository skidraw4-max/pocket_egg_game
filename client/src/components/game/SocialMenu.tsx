import React, { useState } from 'react';
import { useGame } from '@/contexts/GameContext';

type Tab = 'friends' | 'ranking' | 'visitors' | 'sync';

const STAGE_EMOJI: Record<string, string> = {
  egg: '🥚', baby: '🐣', child: '🐥', teen: '🐦', adult: '🦅', mythic: '🌟',
};

const TAB_LABELS: Record<Tab, string> = {
  friends: '👫 친구',
  ranking: '🏆 랭킹',
  visitors: '👋 방문자',
  sync: '☁️ 내 정보',
};

export default function SocialMenu({ onClose }: { onClose: () => void }) {
  const {
    ranking, visitors, friends, recommended, friendCoins,
    syncing, lastSynced, uid, gameId, state,
    visitFriend, addFriendByGameId, removeFriend, copyMyGameId,
  } = useGame();

  const [tab, setTab] = useState<Tab>('friends');
  const [addInput, setAddInput] = useState('');
  const [addStatus, setAddStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [visitingUid, setVisitingUid] = useState<string | null>(null);
  const [visitStatus, setVisitStatus] = useState<{ uid: string; msg: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const myNickname = (state.nickname && state.nickname.trim())
    ? state.nickname.trim()
    : (state.pet?.name ?? '알 주인');

  // ── 친구 추가 ──────────────────────────────
  const handleAdd = async () => {
    const trimmed = addInput.replace('#', '').trim();
    if (!trimmed) return;
    setAddLoading(true);
    setAddStatus(null);
    const result = await addFriendByGameId(trimmed);
    setAddStatus({ type: result.success ? 'success' : 'error', msg: result.message });
    if (result.success) setAddInput('');
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

  // ── 추천 목록에서 친구 추가 ────────────────
  const handleAddRecommended = async (targetGameId: string) => {
    setAddLoading(true);
    setAddStatus(null);
    const result = await addFriendByGameId(targetGameId);
    setAddStatus({ type: result.success ? 'success' : 'error', msg: result.message });
    setAddLoading(false);
    setTimeout(() => setAddStatus(null), 3000);
  };

  // ── UID 복사 ───────────────────────────────
  const handleCopy = async () => {
    const ok = await copyMyGameId();
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  // 배열 방어 처리 (Firebase 연결 전 undefined 대응)
  const safeFriends = Array.isArray(friends) ? friends : [];
  const safeRanking = Array.isArray(ranking) ? ranking : [];
  const safeVisitors = Array.isArray(visitors) ? visitors : [];
  const safeRecommended = Array.isArray(recommended) ? recommended : [];
  const friendUids = new Set(safeFriends.map((f) => f.uid));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden flex flex-col max-h-[90vh]">

        {/* 헤더 */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg">소셜</h2>
            {gameId && (
              <p className="text-white/70 text-xs font-mono">내 ID: #{gameId}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* 친구 코인 잔액 */}
            <div className="bg-white/20 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
              <span className="text-base">🤝</span>
              <span className="text-white font-bold text-sm">{friendCoins.toLocaleString()}</span>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none">×</button>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-100 flex-shrink-0">
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
                tab === t ? 'text-purple-600 border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">

          {/* ── 친구 탭 ── */}
          {tab === 'friends' && (
            <>
              {/* 친구 추가 입력 */}
              <div className="bg-purple-50 rounded-2xl p-3 space-y-2">
                <p className="text-xs font-semibold text-purple-600">친구 추가</p>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center bg-white border border-purple-200 rounded-xl px-3 focus-within:border-purple-400 transition-colors">
                    <span className="text-purple-400 font-bold text-sm mr-1">#</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={addInput}
                      onChange={(e) => { setAddInput(e.target.value); setAddStatus(null); }}
                      onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                      placeholder="12345"
                      className="flex-1 text-sm bg-transparent py-2 outline-none font-mono"
                      maxLength={5}
                    />
                  </div>
                  <button
                    onClick={handleAdd}
                    disabled={addLoading || !addInput.trim()}
                    className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white text-xs font-bold rounded-xl px-4 py-2 transition-colors"
                  >
                    {addLoading ? '...' : '추가'}
                  </button>
                </div>
                {addStatus && (
                  <p className={`text-xs whitespace-pre-line ${addStatus.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                    {addStatus.type === 'success' ? '✓ ' : '✗ '}{addStatus.msg}
                  </p>
                )}
              </div>

              {/* 추천 친구 목록 */}
              {safeRecommended.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500">💡 추천 친구</p>
                  {safeRecommended.map((r) => (
                    <div key={r.uid} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-2xl">
                      <span className="text-xl">{STAGE_EMOJI[r.stage] ?? '🥚'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{r.nickname}</p>
                        <p className="text-xs text-gray-400">Lv.{r.level} · #{r.gameId}</p>
                      </div>
                      <button
                        onClick={() => handleAddRecommended(r.gameId)}
                        disabled={addLoading || friendUids.has(r.uid)}
                        className="bg-amber-400 hover:bg-amber-500 disabled:bg-gray-200 text-white text-xs font-bold rounded-xl px-3 py-1.5 transition-colors whitespace-nowrap"
                      >
                        {friendUids.has(r.uid) ? '친구' : '+ 추가'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 내 친구 목록 */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500">
                  친구 목록 {safeFriends.length > 0 ? `(${safeFriends.length}명)` : ''}
                </p>
                {safeFriends.length === 0 ? (
                  <p className="text-center text-gray-400 py-6 text-sm">
                    아직 친구가 없습니다.<br />
                    위에서 친구 ID를 입력하거나<br />
                    추천 친구를 추가해 보세요!
                  </p>
                ) : (
                  safeFriends.map((f) => (
                    <div key={f.uid} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                      <span className="text-xl">{STAGE_EMOJI[f.stage] ?? '🥚'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{f.nickname}</p>
                        <p className="text-xs text-gray-400">Lv.{f.level} · #{f.gameId}</p>
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
                  ))
                )}
              </div>

              {/* 친구 코인 보상 안내 */}
              <div className="bg-blue-50 rounded-2xl p-3 space-y-1">
                <p className="text-xs font-semibold text-blue-600">🤝 친구 코인 보상</p>
                {[
                  ['친구 추가 성공', '양쪽 모두 50개'],
                  ['친구 방문', '10개 (1일 1회)'],
                  ['친구 3명 달성', '보너스 100개'],
                  ['친구 10명 달성', '보너스 300개'],
                ].map(([label, reward]) => (
                  <div key={label} className="flex justify-between text-xs">
                    <span className="text-gray-500">{label}</span>
                    <span className="text-blue-600 font-semibold">🤝 {reward}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── 랭킹 탭 ── */}
          {tab === 'ranking' && (
            <div className="space-y-2">
              {safeRanking.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">
                  아직 랭킹 데이터가 없습니다.<br />
                  게임을 플레이하면 자동으로 등록됩니다!
                </p>
              ) : (
                safeRanking.map((entry, i) => (
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
                      <p className="text-xs text-gray-400">
                        Lv.{entry.level} · #{entry.gameId ?? '?????'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── 방문자 탭 ── */}
          {tab === 'visitors' && (
            <div className="space-y-2">
              {safeVisitors.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">
                  아직 방문자가 없습니다.<br />
                  친구에게 내 ID를 공유해 보세요!
                </p>
              ) : (
                safeVisitors.map((v) => (
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

          {/* ── 내 정보 탭 ── */}
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

              {/* 내 게임 ID */}
              <div className="bg-purple-50 rounded-2xl p-4 space-y-2">
                <p className="text-xs text-purple-400 font-medium">내 플레이어 ID</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-purple-700 font-mono tracking-widest">
                    #{gameId ?? '-----'}
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold rounded-xl py-2 transition-colors"
                >
                  {copied ? '✓ 복사됨!' : '📋 ID 복사하기'}
                </button>
                <p className="text-xs text-gray-400">
                  이 5자리 ID를 친구에게 알려주면 친구가 나를 추가할 수 있습니다.
                </p>
              </div>

              {/* 친구 코인 잔액 */}
              <div className="bg-amber-50 rounded-2xl p-4 space-y-1">
                <p className="text-xs text-amber-500 font-medium">친구 코인 잔액</p>
                <p className="text-2xl font-bold text-amber-600">🤝 {friendCoins.toLocaleString()}개</p>
                <p className="text-xs text-gray-400">
                  소셜 가구 상점에서 특별 가구를 구매할 수 있습니다.
                </p>
              </div>

              {/* 기능 안내 */}
              <div className="bg-blue-50 rounded-2xl p-4 space-y-1.5">
                <p className="text-xs font-semibold text-blue-600 mb-2">☁️ 클라우드 저장 기능</p>
                {['게임 플레이 5초 후 자동 저장', '기기 변경 시 자동 복원', '오프라인에서도 정상 동작', '글로벌 랭킹 자동 등록'].map((item) => (
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
