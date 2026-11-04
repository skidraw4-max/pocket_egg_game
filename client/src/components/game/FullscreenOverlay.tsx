import type { CSSProperties, ReactNode } from 'react';

interface FullscreenOverlayProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  zClassName?: string;
}

/**
 * 전체 화면 오버레이 — Android StatusBar overlay 시 상단 safe area 확보
 * (TopBar·미니게임 헤더와 동일하게 --app-safe-top 사용)
 */
export default function FullscreenOverlay({
  children,
  className = '',
  style,
  zClassName = 'z-50',
}: FullscreenOverlayProps) {
  return (
    <div
      className={`absolute inset-0 flex flex-col pt-app-safe ${zClassName} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
