import type { CSSProperties, MouseEvent, ReactNode } from 'react';

export type BottomSheetMaxHeight = '80' | '85' | '88' | '90';

const MAX_H: Record<BottomSheetMaxHeight, string> = {
  '80': 'max-h-[min(80dvh,100%)]',
  '85': 'max-h-[min(85dvh,100%)]',
  '88': 'max-h-[min(88dvh,100%)]',
  '90': 'max-h-[min(90dvh,100%)]',
};

export interface BottomSheetPanelProps {
  className?: string;
  maxHeight?: BottomSheetMaxHeight;
  style?: CSSProperties;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  header: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  footerClassName?: string;
  bodyClassName?: string;
}

/** 하단 시트: 헤더·푸터 고정, 본문만 스크롤 + safe-area 하단 패딩 */
export default function BottomSheetPanel({
  className = '',
  maxHeight = '90',
  style,
  onClick,
  header,
  footer,
  children,
  footerClassName = '',
  bodyClassName = '',
}: BottomSheetPanelProps) {
  return (
    <div
      className={`w-full overflow-hidden animate-slide-up flex flex-col ${MAX_H[maxHeight]} ${className}`}
      style={style}
      onClick={onClick}
    >
      <div className="flex-shrink-0">{header}</div>
      <div className={`flex-1 min-h-0 overflow-y-auto ${bodyClassName}`}>{children}</div>
      {footer != null && (
        <div
          className={`flex-shrink-0 px-5 pt-3 pb-app-safe border-t border-border bg-white ${footerClassName}`}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
