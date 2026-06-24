/**
 * SleepOverlay - 수면 모드 오버레이
 * Cozy Nursery: 어두운 배경 + 달과 별 + zzz 애니메이션
 */

export default function SleepOverlay() {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[oklch(0.20_0.03_280)]/70 backdrop-blur-sm transition-opacity duration-500">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-pulse">🌙</div>
        <div className="text-white text-lg font-semibold" style={{ fontFamily: 'Nunito, sans-serif' }}>
          잘 자, 포코...
        </div>
        <div className="text-white/60 text-sm mt-1">피로가 회복되고 있어요</div>
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="text-2xl animate-float-z delay-0">z</span>
          <span className="text-3xl animate-float-z delay-200">z</span>
          <span className="text-4xl animate-float-z delay-400">Z</span>
        </div>
      </div>

      <style>{`
        @keyframes float-z {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-10px); }
        }
        .animate-float-z {
          animation: float-z 2s ease-in-out infinite;
          color: white;
        }
        .delay-0 { animation-delay: 0ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-400 { animation-delay: 400ms; }
      `}</style>
    </div>
  );
}
