/**
 * DailyBonus.tsx
 * 매일 첫 접속 시 출석 보상을 보여주는 팝업
 */
import { useEffect, useState } from 'react';
import { AttendanceResult } from '@/lib/gameState';

interface DailyBonusProps {
  result: AttendanceResult;
  onClose: () => void;
}

export default function DailyBonus({ result, onClose }: DailyBonusProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 마운트 후 페이드인
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  // 연속 출석 마일스톤 메시지
  const streakMsg = () => {
    if (result.streak >= 30) return '🏆 30일 연속 출석! 전설의 주인!';
    if (result.streak >= 14) return '🌟 2주 연속 출석! 대단해요!';
    if (result.streak >= 7)  return '✨ 7일 연속 출석! 젬 보너스!';
    if (result.streak >= 3)  return '🔥 3일 연속 출석 중!';
    return '🌱 오늘도 돌봐줘서 고마워요!';
  };

  // 연속 출석 달력 (최대 7칸)
  const streakDots = Array.from({ length: 7 }, (_, i) => i < result.streak % 7 || result.streak % 7 === 0);

  return (
    <div
      className={`fixed inset-0 z-[300] flex items-center justify-center transition-all duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ background: 'rgba(0,0,0,0.55)' }}
    >
      <div
        className={`relative w-80 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 ${
          visible ? 'scale-100 translate-y-0' : 'scale-90 translate-y-4'
        }`}
        style={{
          background: 'linear-gradient(160deg, #fef9ff 0%, #f0e6ff 50%, #e6f0ff 100%)',
        }}
      >
        {/* 상단 배너 */}
        <div
          className="py-4 text-center"
          style={{ background: 'linear-gradient(135deg, #c084fc, #818cf8)' }}
        >
          <div className="text-3xl mb-1">🎁</div>
          <div className="text-white font-bold text-lg">출석 보상</div>
          <div className="text-purple-100 text-sm">{streakMsg()}</div>
        </div>

        {/* 연속 출석 바 */}
        <div className="px-6 pt-4 pb-2">
          <div className="text-center text-sm text-purple-600 font-semibold mb-2">
            연속 출석 {result.streak}일
          </div>
          <div className="flex justify-center gap-2">
            {streakDots.map((filled, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  filled
                    ? 'bg-purple-400 text-white shadow-md scale-110'
                    : 'bg-purple-100 text-purple-300'
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>
          <div className="text-center text-xs text-purple-400 mt-1">
            7일 연속 달성 시 💎 젬 추가 지급!
          </div>
        </div>

        {/* 보상 내역 */}
        <div className="px-6 py-3">
          <div className="bg-white/70 rounded-2xl p-4 space-y-2">
            <div className="text-center text-sm text-gray-500 font-medium mb-2">오늘의 보상</div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🪙</span>
                <span className="text-gray-700 font-medium">코인</span>
              </div>
              <div className="text-yellow-600 font-bold text-lg">+{result.coinsEarned}</div>
            </div>

            {result.gemsEarned > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💎</span>
                  <span className="text-gray-700 font-medium">젬</span>
                </div>
                <div className="text-blue-600 font-bold text-lg">+{result.gemsEarned}</div>
              </div>
            )}

            {result.gemsEarned === 0 && (
              <div className="text-center text-xs text-gray-400 mt-1">
                {7 - (result.streak % 7)}일 더 출석하면 💎 젬 획득!
              </div>
            )}
          </div>
        </div>

        {/* 확인 버튼 */}
        <div className="px-6 pb-5">
          <button
            onClick={handleClose}
            className="w-full py-3 rounded-2xl text-white font-bold text-base shadow-lg active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg, #c084fc, #818cf8)' }}
          >
            감사합니다! 🎉
          </button>
        </div>
      </div>
    </div>
  );
}
