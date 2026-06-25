import React, { useState } from 'react';
import { useGame } from '@/contexts/GameContext';

type Tab = 'ranking' | 'visitors' | 'sync';

const STAGE_EMOJI: Record<string, string> = {
  egg: '🥚',
  baby: '🐣',
  child: '🐥',
  teen: '🐦',
  adult: '🦅',
  mythic: '🌟',
};

export default function SocialMenu({ onClose }: { onClose: () => void }) {
  const { ranking, visitors, syncing, lastSynced, uid } = useGame();
  const [tab, setTab] = useState<Tab>('ranking');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-5 py-4 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">소셜</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-100">
          {(['ranking', 'visitors', 'sync'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                tab === t
                  ? 'text-purple-600 border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t === 'ranking' ? '🏆 랭킹' : t === 'visitors' ? '👋 방문자' : '☁️ 동기화'}
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {/* ── 랭킹 탭 ── */}
          {tab === 'ranking' && (
            <div className="space-y-2">
              {ranking.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">
                  아직 랭킹 데이터가 없습니다.
                  <br />
                  게임을 플레이하면 자동으로 등록됩니다!
                </p>
              ) : (
                ranking.map((entry, i) => (
                  <div
                    key={entry.uid}
                    className={`flex items-center gap-3 p-3 rounded-2xl ${
                      entry.uid === uid
                        ? 'bg-purple-50 border border-purple-200'
                        : 'bg-gray-50'
                    }`}
                  >
                    {/* 순위 */}
                    <div className="w-8 text-center">
                      {i === 0 ? (
                        <span className="text-xl">🥇</span>
                      ) : i === 1 ? (
                        <span className="text-xl">🥈</span>
                      ) : i === 2 ? (
                        <span className="text-xl">🥉</span>
                      ) : (
                        <span className="text-gray-400 font-bold text-sm">{i + 1}</span>
                      )}
                    </div>
                    {/* 스테이지 이모지 */}
                    <span className="text-2xl">
                      {STAGE_EMOJI[entry.stage] ?? '🥚'}
                    </span>
                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">
                        {entry.nickname}
                        {entry.uid === uid && (
                          <span className="ml-1 text-xs text-purple-500">(나)</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">
                        Lv.{entry.level} · 코인 {entry.coins.toLocaleString()}
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
              {visitors.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">
                  아직 방문자가 없습니다.
                  <br />
                  친구에게 UID를 공유해 보세요!
                </p>
              ) : (
                visitors.map((v) => (
                  <div
                    key={v.uid + v.visitedAt}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl"
                  >
                    <span className="text-2xl">👤</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">
                        {v.nickname}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(v.visitedAt).toLocaleString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
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
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      syncing ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'
                    }`}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {syncing ? '동기화 중...' : '동기화 완료'}
                  </span>
                </div>
                {lastSynced && (
                  <p className="text-xs text-gray-400">
                    마지막 저장:{' '}
                    {lastSynced.toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </p>
                )}
              </div>

              {/* 내 UID */}
              <div className="bg-purple-50 rounded-2xl p-4">
                <p className="text-xs text-purple-400 mb-1 font-medium">내 플레이어 ID</p>
                <p className="text-xs font-mono text-purple-700 break-all leading-relaxed">
                  {uid ?? '로그인 중...'}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  이 ID를 친구에게 공유하면 친구가 방문할 수 있습니다.
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
